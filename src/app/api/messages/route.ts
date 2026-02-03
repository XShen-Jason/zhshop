import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/messages
 * Get user's messages (announcements + group notices for participated groups)
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's participated group IDs
        const { data: participations } = await supabase
            .from('group_participants')
            .select('group_id')
            .eq('user_id', user.id);

        const groupIds = (participations || []).map(p => p.group_id);

        // Get all announcements + group notices for participated groups
        let query = supabase
            .from('messages')
            .select(`
                id, type, title, content, image_url, group_id, created_at,
                group_buys(title)
            `)
            .order('created_at', { ascending: false });

        // Build filter: announcements OR group notices for user's groups
        // Build filter: announcements OR user_specific OR group notices for user's groups
        if (groupIds.length > 0) {
            query = query.or(`type.eq.announcement,type.eq.user_specific,and(type.eq.group_notice,group_id.in.(${groupIds.join(',')}))`);
        } else {
            query = query.or('type.eq.announcement,type.eq.user_specific');
        }

        const { data: messages, error } = await query;

        if (error) {
            console.error('Error fetching messages:', error);
            return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
        }

        // Get read status for these messages
        const messageIds = (messages || []).map(m => m.id);
        const { data: reads } = await supabase
            .from('message_reads')
            .select('message_id')
            .eq('user_id', user.id)
            .in('message_id', messageIds);

        const readIds = new Set((reads || []).map(r => r.message_id));

        // Add read status to messages
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const messagesWithStatus = (messages || []).map((m: any) => ({
            ...m,
            groupTitle: m.group_buys?.title || null,
            isRead: readIds.has(m.id)
        }));

        return NextResponse.json(messagesWithStatus);

    } catch (error) {
        console.error('Error in messages API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
