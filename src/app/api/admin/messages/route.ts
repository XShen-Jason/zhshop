import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/admin/messages - Get all messages (admin only)
 * POST /api/admin/messages - Send new message (admin only)
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (profile?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Use admin client to bypass RLS and fetch all messages
        const adminClient = createAdminClient();
        const { data: messages, error } = await adminClient
            .from('messages')
            .select(`
                id, type, title, content, image_url, group_id, target_user_id, created_at,
                group_buys(title)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching messages:', error);
            return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
        }

        return NextResponse.json(messages || []);

    } catch (error) {
        console.error('Error fetching admin messages:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (profile?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { type, title, content, imageUrl, groupId, targetUser } = body;

        // Validation
        if (!type || !title || !content) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!['announcement', 'group_notice', 'user_specific'].includes(type)) {
            return NextResponse.json({ error: 'Invalid message type' }, { status: 400 });
        }

        if (type === 'group_notice' && !groupId) {
            return NextResponse.json({ error: 'Group notice requires group_id' }, { status: 400 });
        }

        let targetUserId = null;
        if (type === 'user_specific') {
            if (!targetUser) {
                return NextResponse.json({ error: 'Target user is required' }, { status: 400 });
            }

            // Verify target user exists (by ID or Email)
            const adminClient = createAdminClient();

            // Check if input is a valid UUID
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUser);

            if (isUuid) {
                const { data: userById } = await adminClient.from('users').select('id').eq('id', targetUser).maybeSingle();
                if (userById) {
                    targetUserId = userById.id;
                }
            }

            // If not found by ID (or not UUID), try finding by email
            if (!targetUserId) {
                // Use maybeSingle() to avoid error if not found
                const { data: userByEmail } = await adminClient.from('users').select('id').eq('email', targetUser).maybeSingle();
                if (userByEmail) {
                    targetUserId = userByEmail.id;
                } else {
                    return NextResponse.json({ error: 'Target user not found (invalid ID or Email)' }, { status: 404 });
                }
            }
        }

        // Insert message using admin client to bypass RLS
        const adminClient = createAdminClient();
        const { data: message, error } = await adminClient
            .from('messages')
            .insert({
                type,
                title,
                content,
                image_url: imageUrl || null,
                group_id: type === 'group_notice' ? groupId : null,
                target_user_id: targetUserId,
                created_by: user.id
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating message:', error);
            return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
        }

        return NextResponse.json(message);

    } catch (error) {
        console.error('Error in admin messages POST:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (profile?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing message id' }, { status: 400 });
        }

        // Delete message using admin client to bypass RLS
        const adminClient = createAdminClient();
        const { error } = await adminClient
            .from('messages')
            .delete()
            .eq('id', id);

        if (error) {
            return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error deleting message:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
