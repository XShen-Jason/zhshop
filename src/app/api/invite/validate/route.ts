import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/invite/validate?code=xxx - Validate an invite code
 * Returns the inviter's info if valid
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');

        if (!code) {
            return NextResponse.json({ valid: false, error: '邀请码不能为空' }, { status: 400 });
        }

        // Use admin client to bypass RLS
        const adminClient = createAdminClient();

        const { data: inviter, error } = await adminClient
            .from('users')
            .select('id, name')
            .eq('invite_code', code)
            .single();

        if (error || !inviter) {
            return NextResponse.json({ valid: false, error: '邀请码无效，请检查后重新输入' });
        }

        return NextResponse.json({
            valid: true,
            inviterId: inviter.id,
            inviterName: inviter.name
        });

    } catch (error) {
        console.error('Error validating invite code:', error);
        return NextResponse.json({ valid: false, error: '验证失败，请稍后重试' }, { status: 500 });
    }
}
