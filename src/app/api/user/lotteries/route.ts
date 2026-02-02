import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Get user's lottery entries with lottery details
        const { data: entries, error } = await supabase
            .from('lottery_entries')
            .select(`
        id,
        lottery_id,
        entered_at,
        is_winner,
        lotteries (
          id,
          title,
          status,
          draw_date,
          entry_cost,
          prizes
        )
      `)
            .eq('user_id', user.id)
            .order('entered_at', { ascending: false });

        if (error) throw error;

        const lotteryHistory = (entries || []).map((entry: any) => ({
            id: entry.id,
            lotteryId: entry.lottery_id,
            enteredAt: entry.entered_at,
            isWinner: entry.is_winner,
            lottery: entry.lotteries ? {
                id: entry.lotteries.id,
                title: entry.lotteries.title,
                status: entry.lotteries.status,
                drawDate: entry.lotteries.draw_date,
                entryCost: entry.lotteries.entry_cost,
                prizes: entry.lotteries.prizes
            } : null
        }));

        return NextResponse.json(lotteryHistory);
    } catch (error) {
        console.error('Error fetching lottery history:', error);
        return NextResponse.json({ error: 'Failed to fetch lottery history' }, { status: 500 });
    }
}
