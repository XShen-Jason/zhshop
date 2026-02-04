import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Update type interface
interface UpdateParams {
    groupId: string;
    userId: string;
    quantity: number;
}

interface DeleteParams {
    groupId: string;
    userId: string;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const groupId = searchParams.get('groupId');

        if (!groupId) return NextResponse.json({ error: 'Missing groupId' }, { status: 400 });

        // 1. Auth & Admin Check (Standard Client)
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (profile?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        // 2. Fetch Data (Admin Client to bypass RLS for user names)
        const adminClient = createAdminClient();
        const { data, error } = await adminClient
            .from('group_participants')
            .select('user_id, joined_at, quantity, is_contacted, contact_info, users(email, name, saved_contacts)')
            .eq('group_id', groupId);

        if (error) throw error;

        // 3. Aggregate Data
        const aggregated = (data || []).reduce((acc: any, d: any) => {
            const userIdKey = d.user_id || 'anonymous';
            if (!acc[userIdKey]) {
                acc[userIdKey] = {
                    id: userIdKey,
                    userId: userIdKey,
                    // Prioritize participant-row contact_info, fallback to user email
                    contact: d.contact_info || d.users?.email || '-',
                    joinedAt: d.joined_at,
                    quantity: 0,
                    isContacted: d.is_contacted,
                    users: d.users,
                    name: d.users?.name, // Explicitly set name
                    savedContacts: d.users?.saved_contacts || []
                };
            }
            acc[userIdKey].quantity += (d.quantity || 1);
            // If any record says contacted, keep it? Or strictly sync?
            // Since we updated all rows in PUT, they should be consistent.
            // But let's safe guard: if current d.is_contacted is true, ensure acc is true.
            if (d.is_contacted) acc[userIdKey].isContacted = true;

            return acc;
        }, {});

        // Return array
        return NextResponse.json(Object.values(aggregated));
    } catch (error) {
        console.error('Error fetching participants:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const supabase = await createClient();

        // 1. Auth & Admin Check
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (profile?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body: UpdateParams & { isContacted?: boolean } = await request.json();
        const { groupId, userId, quantity, isContacted } = body;

        if (!groupId || !userId) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // Handle isContacted toggle
        if (isContacted !== undefined) {
            const { error: updateError } = await supabase
                .from('group_participants')
                .update({ is_contacted: isContacted })
                .eq('group_id', groupId)
                .eq('user_id', userId);

            if (updateError) throw updateError;
            return NextResponse.json({ success: true });
        }

        if (quantity === undefined) {
            return NextResponse.json({ error: 'Missing quantity' }, { status: 400 });
        }

        // 2. Get old quantity to adjust count
        const { data: oldData, error: fetchError } = await supabase
            .from('group_participants')
            .select('quantity')
            .eq('group_id', groupId)
            .eq('user_id', userId)
            .single();

        if (fetchError || !oldData) {
            return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
        }

        const oldQty = oldData.quantity || 1;
        const diff = quantity - oldQty;

        // 3. Update participant
        const { error: updateError } = await supabase
            .from('group_participants')
            .update({ quantity })
            .eq('group_id', groupId)
            .eq('user_id', userId);

        if (updateError) throw updateError;

        // 4. Update group total count (if changed)
        if (diff !== 0) {
            const { data: group } = await supabase.from('group_buys').select('current_count, target_count').eq('id', groupId).single();
            if (group) {
                const newTotal = (group.current_count || 0) + diff;

                // Validate if exceeding target count
                if (newTotal > (group.target_count || 0)) {
                    return NextResponse.json({ error: '修改后的总份数超过拼团目标人数' }, { status: 400 });
                }

                await supabase.from('group_buys').update({
                    current_count: newTotal
                }).eq('id', groupId);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating participant:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient();

        // 1. Auth & Admin Check
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (profile?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body: DeleteParams = await request.json();
        const { groupId, userId } = body;

        if (!groupId || !userId) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // 2. Get quantity to adjust count
        const { data: oldData } = await supabase
            .from('group_participants')
            .select('quantity')
            .eq('group_id', groupId)
            .eq('user_id', userId)
            .single();

        if (!oldData) return NextResponse.json({ error: 'Participant not found' }, { status: 404 });

        const qtyToRemove = oldData.quantity || 1;

        // 3. Delete participant
        const { error: deleteError } = await supabase
            .from('group_participants')
            .delete()
            .eq('group_id', groupId)
            .eq('user_id', userId);

        if (deleteError) throw deleteError;

        // 4. Update group total count
        const { data: group } = await supabase.from('group_buys').select('current_count').eq('id', groupId).single();
        if (group) {
            await supabase.from('group_buys').update({
                current_count: Math.max(0, (group.current_count || 0) - qtyToRemove)
            }).eq('id', groupId);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting participant:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
