import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { beijingToUtcIso } from '@/lib/timezone';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('lotteries')
            .select('*, lottery_entries(count)')
            .order('draw_date', { ascending: true });

        if (error) throw error;

        const now = new Date();

        // Auto-extend logic: if draw date passed and participants < minParticipants, extend by 1 day
        for (const lottery of data || []) {
            if (lottery.status === '已结束') continue;

            const drawDate = new Date(lottery.draw_date);
            const participantCount = lottery.lottery_entries?.[0]?.count ?? 0;
            const minParticipants = lottery.min_participants || 1;

            // If draw date has passed and participants are insufficient
            if (drawDate <= now && participantCount < minParticipants) {
                // Extend draw date by 1 day from now
                const newDrawDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

                await supabase
                    .from('lotteries')
                    .update({ draw_date: newDrawDate.toISOString() })
                    .eq('id', lottery.id);

                // Update local data for response
                lottery.draw_date = newDrawDate.toISOString();
                console.log(`Lottery ${lottery.id} auto-extended to ${newDrawDate.toISOString()} due to insufficient participants (${participantCount}/${minParticipants})`);
            }
        }

        const lotteries = (data || []).map(l => ({
            id: l.id,
            title: l.title,
            drawDate: l.draw_date,
            winnersCount: l.winners_count,
            entryCost: l.entry_cost,
            minParticipants: l.min_participants || 1,
            status: l.status,
            participants: l.lottery_entries?.[0]?.count ?? l.participants ?? 0,
            description: l.description,
            prizes: l.prizes || []
        }));

        return NextResponse.json(lotteries);
    } catch (error) {
        console.error('Error fetching lotteries:', error);
        return NextResponse.json({ error: 'Failed to fetch lotteries' }, { status: 500 });
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

        // Convert local datetime-local input (Beijing Time) to UTC ISO format
        const drawDateISO = beijingToUtcIso(body.drawDate);

        const { error } = await supabase.from('lotteries').insert({
            title: body.title,
            description: body.description,
            draw_date: drawDateISO,
            winners_count: body.winnersCount,
            entry_cost: body.entryCost,
            min_participants: body.minParticipants || 1,
            status: '待开奖',
            participants: 0,
            prizes: body.prizes || []
        });

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error creating lottery:', error);
        return NextResponse.json({ error: 'Failed to create lottery' }, { status: 500 });
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
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.drawDate) {
            updateData.draw_date = beijingToUtcIso(updates.drawDate);
        }
        if (updates.winnersCount !== undefined) updateData.winners_count = updates.winnersCount;
        if (updates.entryCost !== undefined) updateData.entry_cost = updates.entryCost;
        if (updates.minParticipants !== undefined) updateData.min_participants = updates.minParticipants;
        if (updates.status) updateData.status = updates.status;
        if (updates.prizes) updateData.prizes = updates.prizes;

        const { error } = await supabase
            .from('lotteries')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating lottery:', error);
        return NextResponse.json({ error: 'Failed to update lottery' }, { status: 500 });
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
            .from('lotteries')
            .delete()
            .eq('id', body.id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting lottery:', error);
        return NextResponse.json({ error: 'Failed to delete lottery' }, { status: 500 });
    }
}
