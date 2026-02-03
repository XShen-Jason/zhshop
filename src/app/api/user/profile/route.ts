import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * PATCH /api/user/profile - Update user profile (name)
 */
export async function PATCH(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name } = body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json({ error: '用户名不能为空' }, { status: 400 });
        }

        if (name.trim().length > 50) {
            return NextResponse.json({ error: '用户名不能超过50个字符' }, { status: 400 });
        }

        // Update in public.users table
        const { error } = await supabase
            .from('users')
            .update({ name: name.trim() })
            .eq('id', user.id);

        if (error) {
            console.error('Error updating user name:', error);
            return NextResponse.json({ error: '更新失败' }, { status: 500 });
        }

        // Also update auth.users metadata
        await supabase.auth.updateUser({
            data: { name: name.trim() }
        });

        return NextResponse.json({ success: true, name: name.trim() });

    } catch (error) {
        console.error('Error in profile update:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
