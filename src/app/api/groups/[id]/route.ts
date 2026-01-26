import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET single group by ID
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        // Fetch group with accurate participant count
        const { data: group, error } = await supabase
            .from('group_buys')
            .select('*, group_participants(count)')
            .eq('id', id)
            .single();

        if (error || !group) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        // Map to frontend format with auto-computed status
        const currentCount = group.group_participants?.[0]?.count ?? group.current_count ?? 0;
        const targetCount = group.target_count ?? 1;

        let status = group.status;
        if (status !== '已结束') {
            status = currentCount >= targetCount ? '已锁单' : '进行中';
        }

        const result = {
            id: group.id,
            title: group.title,
            description: group.description,
            price: group.price,
            targetCount: targetCount,
            currentCount: currentCount,
            status: status,
            features: group.features || [],
            autoRenew: group.auto_renew ?? false
        };

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching group:', error);
        return NextResponse.json({ error: 'Failed to fetch group' }, { status: 500 });
    }
}
