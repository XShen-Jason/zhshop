import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Get user points
        const { data: profile } = await supabase
            .from('users')
            .select('points')
            .eq('id', user.id)
            .single();

        // Get point logs
        const { data: logs, error } = await supabase
            .from('point_logs')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const formattedLogs = (logs || []).map(log => ({
            id: log.id,
            amount: log.amount,
            reason: log.reason,
            type: log.type,
            createdAt: log.created_at
        }));

        return NextResponse.json({
            points: profile?.points || 0,
            logs: formattedLogs
        });
    } catch (error) {
        console.error('Error fetching point logs:', error);
        return NextResponse.json({ error: 'Failed to fetch point logs' }, { status: 500 });
    }
}
