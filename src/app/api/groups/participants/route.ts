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
            .select('user_id, joined_at, quantity, contact_info, users(email, name)')
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
                    users: d.users,
                    name: d.users?.name // Explicitly set name
                };
            }
            acc[userIdKey].quantity += (d.quantity || 1);
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

        const body: UpdateParams = await request.json();
        const { groupId, userId, quantity } = body;

        if (!groupId || !userId || quantity === undefined) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
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
            const { data: group } = await supabase.from('group_buys').select('current_count').eq('id', groupId).single();
            if (group) {
                await supabase.from('group_buys').update({
                    current_count: (group.current_count || 0) + diff
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
