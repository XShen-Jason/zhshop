'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { headers } from 'next/headers';

export async function login(formData: FormData) {
    const supabase = await createClient();

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    };

    const { error } = await supabase.auth.signInWithPassword(data);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/', 'layout');
    redirect('/');
}

export async function signup(formData: FormData) {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;
    const inviteCode = formData.get('inviteCode') as string;

    // ========== Validate Invite Code (Required) ==========
    let inviterId: string | null = null;

    if (inviteCode) {
        const { data: inviter } = await adminClient
            .from('users')
            .select('id')
            .eq('invite_code', inviteCode)
            .single();

        if (!inviter) {
            return { error: '邀请码无效，请检查后重新输入' };
        }
        inviterId = inviter.id;
    }

    // ========== Lazy Cleanup: Delete unverified users older than 24h ==========
    try {
        // Check for existing unverified user with the same email
        const { data: existingUsers } = await adminClient.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === email);

        if (existingUser && !existingUser.email_confirmed_at) {
            const createdAt = new Date(existingUser.created_at);
            const now = new Date();
            const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

            // If unverified and older than 24 hours, delete the user
            if (hoursSinceCreation > 24) {
                console.log(`Lazy cleanup: Deleting unverified user ${email} (created ${hoursSinceCreation.toFixed(1)}h ago)`);

                // Delete from auth.users
                await adminClient.auth.admin.deleteUser(existingUser.id);

                // Also delete from public.users if exists
                await adminClient.from('users').delete().eq('id', existingUser.id);
            }
        }
    } catch (cleanupError) {
        console.error('Lazy cleanup error (non-fatal):', cleanupError);
        // Continue with signup even if cleanup fails
    }

    // Proceed with normal signup
    const { data: authData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                name,
            },
        },
    });

    if (error) {
        // Provide more helpful error message for already registered users
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
            return { error: '该邮箱已注册。如您之前未完成验证，请稍后重试或联系管理员。' };
        }
        return { error: error.message };
    }

    // Create user profile in the users table
    if (authData.user) {
        // Calculate points: 200 base + 100 bonus if invited
        const basePoints = 200;
        const inviteBonus = inviterId ? 100 : 0;
        const totalPoints = basePoints + inviteBonus;

        // Use admin client to bypass RLS for user creation
        const { error: profileError } = await adminClient.from('users').upsert({
            id: authData.user.id,
            email,
            name,
            role: 'USER',
            points: totalPoints,
            invited_by: inviterId,
        }, { onConflict: 'id' });

        if (profileError) {
            console.error('Error creating user profile:', profileError);
        } else {
            // Add point log for registration bonus
            await adminClient.from('point_logs').insert({
                user_id: authData.user.id,
                amount: basePoints,
                reason: '新用户注册奖励',
                type: 'EARN'
            });

            // If invited, add bonus log for new user and reward for inviter
            if (inviterId) {
                // Log invite bonus for new user
                await adminClient.from('point_logs').insert({
                    user_id: authData.user.id,
                    amount: inviteBonus,
                    reason: '邀请码注册奖励',
                    type: 'EARN'
                });

                // Award inviter 200 points
                const { data: inviterProfile } = await adminClient
                    .from('users')
                    .select('points')
                    .eq('id', inviterId)
                    .single();

                if (inviterProfile) {
                    const newInviterPoints = (inviterProfile.points || 0) + 200;
                    await adminClient.from('users').update({ points: newInviterPoints }).eq('id', inviterId);

                    // Log inviter reward
                    await adminClient.from('point_logs').insert({
                        user_id: inviterId,
                        amount: 200,
                        reason: `邀请用户 ${name} 注册奖励`,
                        type: 'EARN'
                    });
                }
            }
        }
    }

    // Return success with email for login page auto-fill
    return { success: true, email };
}

export async function logout() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    revalidatePath('/', 'layout');
    redirect('/');
}

export async function forgotPassword(formData: FormData) {
    const supabase = await createClient();
    const email = formData.get('email') as string;

    // 动态获取当前请求的 Origin，适配预览环境和生产环境
    const headersList = await headers();
    const origin = headersList.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
    });

    if (error) {
        return { error: error.message };
    }

    return { success: true };
}

export async function resetPassword(formData: FormData) {
    const supabase = await createClient();
    const password = formData.get('password') as string;

    const { error } = await supabase.auth.updateUser({
        password,
    });

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/', 'layout');
    return { success: true };
}

// ========== Resend Verification Email ==========
export async function resendVerification(email: string) {
    const supabase = await createClient();

    const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
    });

    if (error) {
        return { error: error.message };
    }

    return { success: true };
}

