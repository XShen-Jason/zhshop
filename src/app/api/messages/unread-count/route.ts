import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/messages/unread-count
 * Get count of unread messages for current user
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ count: 0 });
        }

        // Get user's participated group IDs
        const { data: participations } = await supabase
            .from('group_participants')
            .select('group_id')
            .eq('user_id', user.id);

        const groupIds = (participations || []).map(p => p.group_id);

        // Count all messages user can see
        let query = supabase
            .from('messages')
            .select('id');

        if (groupIds.length > 0) {
            query = query.or(`type.eq.announcement,type.eq.user_specific,and(type.eq.group_notice,group_id.in.(${groupIds.join(',')}))`);
        } else {
            query = query.or('type.eq.announcement,type.eq.user_specific');
        }

        const { data: allMessages } = await query;
        const messageIds = (allMessages || []).map(m => m.id);

        if (messageIds.length === 0) {
            return NextResponse.json({ count: 0 });
        }

        // Count read messages
        const { data: reads } = await supabase
            .from('message_reads')
            .select('message_id')
            .eq('user_id', user.id)
            .in('message_id', messageIds);

        const readCount = (reads || []).length;
        const unreadCount = messageIds.length - readCount;

        return NextResponse.json({ count: unreadCount });

    } catch (error) {
        console.error('Error getting unread count:', error);
        return NextResponse.json({ count: 0 });
    }
}
