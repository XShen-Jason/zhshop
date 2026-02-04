
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // 1. Auth & Admin Check
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (profile?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        // 2. Parse Body
        const { groupId, userId, targetGroupId } = await request.json();

        if (!groupId || !userId || !targetGroupId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (groupId === targetGroupId) {
            return NextResponse.json({ error: 'Target group must be different' }, { status: 400 });
        }

        // 3. Validation

        // A. Check Target Group
        // We need to verify it exists, is ACTIVE, and has space.
        const { data: targetGroup, error: targetError } = await supabase
            .from('group_buys')
            .select('*, group_participants(quantity)')
            .eq('id', targetGroupId)
            .single();

        if (targetError || !targetGroup) {
            return NextResponse.json({ error: 'Target group not found' }, { status: 404 });
        }

        // Check if target is 'ended' (Completed). 
        // We allow moving to LOCKED groups? Probably yes, admins can force override.
        // But user requirement says "Ensure count does not exceed".
        if (targetGroup.status === '已结束') {
            return NextResponse.json({ error: 'Target group is ended' }, { status: 400 });
        }

        // Calculate Target Current Count
        const currentCount = (targetGroup.group_participants || []).reduce((sum: number, p: any) => sum + (p.quantity || 1), 0);

        // Fetch User's Quantity in Source Group
        const { data: participantData, error: participantError } = await supabase
            .from('group_participants')
            .select('quantity, id') // selecting id just to confirm existence
            .eq('group_id', groupId)
            .eq('user_id', userId)
            .single();

        if (participantError || !participantData) {
            return NextResponse.json({ error: 'Participant not found in source group' }, { status: 404 });
        }

        const quantityToMove = participantData.quantity || 1;

        // Check Capacity
        if (currentCount + quantityToMove > targetGroup.target_count) {
            return NextResponse.json({ error: `Not enough space in target group (Available: ${targetGroup.target_count - currentCount}, Needed: ${quantityToMove})` }, { status: 400 });
        }

        // 4. Execute Move
        // We update the existing record.
        // Note: Unique constraint on (group_id, user_id) might exist.
        // If user is ALREADY in target group, we might need to merge (update quantity)?
        // Or fail? "User already in target group".
        // Let's check if user is in target group.
        const { data: existingInTarget } = await supabase
            .from('group_participants')
            .select('id, quantity')
            .eq('group_id', targetGroupId)
            .eq('user_id', userId)
            .single();

        if (existingInTarget) {
            // Merge logic: Add quantity to valid record, delete old record?
            // This is safer.
            const newQuantity = (existingInTarget.quantity || 1) + quantityToMove;

            // Re-check capacity for merged quantity is not needed because we checked (current + quantityToMove) vs target.
            // Wait, existing quantity IS included in `currentCount` of target group! 
            // So if user IS in target group, we are effectively just increasing their quantity there.
            // But we are removing them from source, so we are moving 'quantityToMove' ADDITIONALLY to target?
            // No, the user ALREADY contributes `existingInTarget.quantity` to `currentCount`.
            // We are ADDING `quantityToMove`.
            // Logic holds.

            // 1. Update target record
            const { error: updateError } = await supabase
                .from('group_participants')
                .update({ quantity: newQuantity })
                .eq('id', existingInTarget.id);

            if (updateError) throw updateError;

            // 2. Delete source record
            const { error: deleteError } = await supabase
                .from('group_participants')
                .delete()
                .eq('group_id', groupId)
                .eq('user_id', userId);

            if (deleteError) throw deleteError;

        } else {
            // Simple Move: Update group_id
            const { error: moveError } = await supabase
                .from('group_participants')
                .update({ group_id: targetGroupId })
                .eq('group_id', groupId)
                .eq('user_id', userId);

            if (moveError) throw moveError;
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Error moving member:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
