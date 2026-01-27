import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const limit = url.searchParams.get('limit');

        const supabase = await createClient();
        // Fetch groups with participant count
        let query = supabase
            .from('group_buys')
            .select('*, group_participants(count)')
            .order('created_at', { ascending: false });

        if (limit) {
            query = query.limit(parseInt(limit, 10));
        }

        const { data, error } = await query;

        if (error) throw error;

        const groups = (data || []).map(g => {
            const currentCount = g.group_participants?.[0]?.count ?? g.current_count ?? 0;
            const targetCount = g.target_count ?? 1;

            // Auto-compute status based on progress
            // Only manual "已结束" is respected as an override
            let status = g.status;
            if (status !== '已结束') {
                if (currentCount >= targetCount) {
                    status = '已锁单';
                } else {
                    status = '进行中';
                }
            }

            return {
                id: g.id,
                title: g.title,
                targetCount: targetCount,
                currentCount: currentCount,
                status: status,
                price: g.price,
                description: g.description,
                features: g.features || [],
                autoRenew: g.auto_renew ?? false
            };
        });

        return NextResponse.json(groups);
    } catch (error) {
        console.error('Error fetching groups:', error);
        return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // Auth & Admin check
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (profile?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await request.json();

        const { error } = await supabase.from('group_buys').insert({
            title: body.title,
            description: body.description,
            price: body.price,
            target_count: body.targetCount,
            current_count: 0,
            status: '进行中',
            features: body.features || [],
            auto_renew: body.autoRenew ?? false
        });

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error creating group:', error);
        return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const supabase = await createClient();

        // Auth & Admin check
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (profile?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await request.json();
        const { id, ...updates } = body;

        const updateData: any = {};
        if (updates.title) updateData.title = updates.title;
        if (updates.description) updateData.description = updates.description;
        if (updates.price !== undefined) updateData.price = updates.price;
        if (updates.targetCount !== undefined) updateData.target_count = updates.targetCount;
        if (updates.currentCount !== undefined) updateData.current_count = updates.currentCount;
        if (updates.status) updateData.status = updates.status;
        if (updates.features) updateData.features = updates.features;
        if (updates.autoRenew !== undefined) updateData.auto_renew = updates.autoRenew;

        const { error } = await supabase
            .from('group_buys')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating group:', error);
        return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient();

        // Auth & Admin check
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (profile?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await request.json();

        const { error } = await supabase
            .from('group_buys')
            .delete()
            .eq('id', body.id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting group:', error);
        return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
    }
}
