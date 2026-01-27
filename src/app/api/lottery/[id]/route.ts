import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        // Get lottery details
        const { data: lottery, error } = await supabase
            .from('lotteries')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (!lottery) {
            return NextResponse.json({ error: 'Lottery not found' }, { status: 404 });
        }

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        // Check if current user has entered
        let hasEntered = false;
        if (user) {
            const { data: entry } = await supabase
                .from('lottery_entries')
                .select('id')
                .eq('lottery_id', id)
                .eq('user_id', user.id)
                .single();

            hasEntered = !!entry;
        }

        // Get actual participant count
        const { count: participantCount } = await supabase
            .from('lottery_entries')
            .select('*', { count: 'exact', head: true })
            .eq('lottery_id', id);

        // Get winners if lottery is completed
        let winners: Array<{ name: string; isWinner: boolean }> = [];
        if (lottery.status === '已结束') {
            const { data: winnerEntries } = await supabase
                .from('lottery_entries')
                .select('user_id, is_winner, users(name)')
                .eq('lottery_id', id)
                .eq('is_winner', true);

            winners = (winnerEntries || []).map((entry: any) => ({
                name: maskName(entry.users?.name || '匿名用户'),
                isWinner: true
            }));
        }

        return NextResponse.json({
            id: lottery.id,
            title: lottery.title,
            drawDate: lottery.draw_date,
            winnersCount: lottery.winners_count,
            entryCost: lottery.entry_cost,
            status: lottery.status,
            participants: participantCount || lottery.participants,
            description: lottery.description,
            prizes: lottery.prizes || [],
            hasEntered,
            winners
        });
    } catch (error) {
        console.error('Error fetching lottery:', error);
        return NextResponse.json({ error: 'Failed to fetch lottery' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: '请先登录' }, { status: 401 });
        }

        // Get lottery details
        const { data: lottery, error: lotteryError } = await supabase
            .from('lotteries')
            .select('*')
            .eq('id', id)
            .single();

        if (lotteryError || !lottery) {
            return NextResponse.json({ error: '抽奖不存在' }, { status: 404 });
        }

        if (lottery.status !== '待开奖') {
            return NextResponse.json({ error: '该抽奖已结束' }, { status: 400 });
        }

        // Check if already entered
        const { data: existingEntry } = await supabase
            .from('lottery_entries')
            .select('id')
            .eq('lottery_id', id)
            .eq('user_id', user.id)
            .single();

        if (existingEntry) {
            return NextResponse.json({ error: '您已经参与过该抽奖' }, { status: 400 });
        }

        // Get user points
        const { data: userProfile } = await supabase
            .from('users')
            .select('points')
            .eq('id', user.id)
            .single();

        const currentPoints = userProfile?.points || 0;
        if (currentPoints < lottery.entry_cost) {
            return NextResponse.json({
                error: `积分不足，需要 ${lottery.entry_cost} 积分，当前仅有 ${currentPoints} 积分`
            }, { status: 400 });
        }

        // Deduct points
        const newPoints = currentPoints - lottery.entry_cost;
        const { error: updateError } = await supabase
            .from('users')
            .update({ points: newPoints, updated_at: new Date().toISOString() })
            .eq('id', user.id);

        if (updateError) throw updateError;

        // Create lottery entry
        const { error: entryError } = await supabase
            .from('lottery_entries')
            .insert({
                lottery_id: id,
                user_id: user.id,
                is_winner: false
            });

        if (entryError) throw entryError;

        // Update participants count
        await supabase
            .from('lotteries')
            .update({ participants: lottery.participants + 1 })
            .eq('id', id);

        // Add point log
        await supabase.from('point_logs').insert({
            user_id: user.id,
            amount: lottery.entry_cost,
            reason: `参与抽奖: ${lottery.title}`,
            type: 'SPEND'
        });

        return NextResponse.json({
            success: true,
            pointsSpent: lottery.entry_cost,
            newPoints
        });
    } catch (error) {
        console.error('Error entering lottery:', error);
        return NextResponse.json({ error: 'Failed to enter lottery' }, { status: 500 });
    }
}

// Mask name for privacy
function maskName(name: string): string {
    if (!name) return '***';

    // Check if it contains Chinese characters
    const hasChinese = /[\u4e00-\u9fa5]/.test(name);

    if (hasChinese) {
        // For Chinese: show first character + stars
        const firstChar = name.charAt(0);
        return firstChar + '*'.repeat(Math.max(1, name.length - 1));
    } else {
        // For English: show first 2 characters + stars
        if (name.length <= 2) {
            return name.charAt(0) + '*';
        }
        return name.substring(0, 2) + '*'.repeat(Math.max(1, name.length - 2));
    }
}
