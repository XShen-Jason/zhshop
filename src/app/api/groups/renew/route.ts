
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkAndTriggerAutoRenew } from '@/lib/group-auto-renew';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // Auth Check
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { groupId } = body;

        if (!groupId) {
            return NextResponse.json({ error: 'GroupId is required' }, { status: 400 });
        }

        const adminClient = createAdminClient();
        const result = await checkAndTriggerAutoRenew(adminClient, groupId);

        if (result.success) {
            return NextResponse.json({ success: true, newGroup: result.newGroup });
        } else {
            return NextResponse.json({ error: result.reason || 'Renew failed' }, { status: 400 });
        }

    } catch (error) {
        console.error('Error in manual renew:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
