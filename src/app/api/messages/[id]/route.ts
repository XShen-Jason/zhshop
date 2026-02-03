import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/messages/[id] - Get single message and mark as read
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get message
        const { data: message, error } = await supabase
            .from('messages')
            .select(`
                id, type, title, content, image_url, group_id, created_at,
                group_buys(title)
            `)
            .eq('id', id)
            .single();

        if (error || !message) {
            return NextResponse.json({ error: 'Message not found' }, { status: 404 });
        }

        // Check access for group notices
        if (message.type === 'group_notice' && message.group_id) {
            const { data: participation } = await supabase
                .from('group_participants')
                .select('id')
                .eq('group_id', message.group_id)
                .eq('user_id', user.id)
                .single();

            if (!participation) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }
        }

        // Mark as read (upsert to avoid duplicates)
        await supabase
            .from('message_reads')
            .upsert({
                message_id: id,
                user_id: user.id,
                read_at: new Date().toISOString()
            }, {
                onConflict: 'message_id,user_id'
            });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return NextResponse.json({
            ...message,
            groupTitle: (message as any).group_buys?.title || null
        });

    } catch (error) {
        console.error('Error fetching message:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
