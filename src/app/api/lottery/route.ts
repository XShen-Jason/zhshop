import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { beijingToUtcIso } from '@/lib/timezone';

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const limit = url.searchParams.get('limit');

        const supabase = await createClient();

        // Get current user (optional - for participation status)
        const { data: { user } } = await supabase.auth.getUser();

        // Fetch all lotteries - we'll sort and limit in JS
        const query = supabase
            .from('lotteries')
            .select('*, lottery_entries(count)')
            .order('draw_date', { ascending: true });

        const { data, error } = await query;

        if (error) throw error;

        // If user is logged in, get their entries to mark participated lotteries
        let userEntryLotteryIds: Set<string> = new Set();
        if (user) {
            const { data: entries } = await supabase
                .from('lottery_entries')
                .select('lottery_id')
                .eq('user_id', user.id);
            userEntryLotteryIds = new Set((entries || []).map(e => e.lottery_id));
        }

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

        let lotteries = (data || []).map(l => ({
            id: l.id,
            title: l.title,
            drawDate: l.draw_date,
            winnersCount: l.winners_count,
            entryCost: l.entry_cost,
            minParticipants: l.min_participants || 1,
            status: l.status,
            participants: l.lottery_entries?.[0]?.count ?? l.participants ?? 0,
            description: l.description,
            prizes: l.prizes || [],
            hasEntered: userEntryLotteryIds.has(l.id),
            isHot: l.is_hot || false
        }));

        // Sort: status priority (pending first), then isHot, then by drawDate
        lotteries.sort((a, b) => {
            // 1. Status: 待开奖 first
            if (a.status === '待开奖' && b.status !== '待开奖') return -1;
            if (a.status !== '待开奖' && b.status === '待开奖') return 1;
            // 2. isHot: Hot items first within same status
            if (a.isHot !== b.isHot) {
                return a.isHot ? -1 : 1;
            }
            // 3. Draw date: ascending for pending, descending for ended
            return new Date(a.drawDate).getTime() - new Date(b.drawDate).getTime();
        });

        // Apply limit after sorting
        if (limit) {
            lotteries = lotteries.slice(0, parseInt(limit, 10));
        }

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
            prizes: body.prizes || [],
            is_hot: body.isHot ?? false
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
        if (updates.isHot !== undefined) updateData.is_hot = updates.isHot;

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
