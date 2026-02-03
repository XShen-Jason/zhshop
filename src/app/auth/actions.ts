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

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;

    // ========== Lazy Cleanup: Delete unverified users older than 24h ==========
    try {
        const adminClient = createAdminClient();

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
        // Use upsert to handle potential race conditions with database triggers
        const { error: profileError } = await supabase.from('users').upsert({
            id: authData.user.id,
            email,
            name,
            role: 'USER',
            points: 200, // Welcome bonus
        }, { onConflict: 'id' });

        if (profileError) {
            console.error('Error creating user profile:', profileError);
        } else {
            // Add point log for registration bonus
            await supabase.from('point_logs').insert({
                user_id: authData.user.id,
                amount: 200,
                reason: '新用户注册奖励',
                type: 'EARN'
            });
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

