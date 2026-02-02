import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Auto-draw endpoint - checks for lotteries past their draw date and executes draw
 * Features:
 * - Checks min_participants requirement
 * - Auto-extends draw_date by 1 day if participants < min_participants
 * - Only draws when conditions are met
 */
export async function POST() {
    try {
        const supabase = createAdminClient();
        const now = new Date();

        // Use local time string format to match how dates are stored from admin panel
        // datetime-local inputs typically save without timezone offset
        // We convert to ISO but this ensures consistent comparison
        const nowISO = now.toISOString();

        // Also create a local timestamp string for logging
        const localTimeStr = now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
        console.log('Auto-draw: Checking at', localTimeStr, '(UTC:', nowISO, ')');

        // Find lotteries that are past draw_date but still pending
        const { data: pendingLotteries, error: fetchError } = await supabase
            .from('lotteries')
            .select('id, title, draw_date, winners_count, min_participants, participants')
            .eq('status', '待开奖')
            .lte('draw_date', nowISO);

        if (fetchError) {
            console.error('Auto-draw: Error fetching pending lotteries:', fetchError);
            return NextResponse.json({
                error: 'Failed to fetch lotteries',
                details: fetchError.message
            }, { status: 500 });
        }

        if (!pendingLotteries || pendingLotteries.length === 0) {
            return NextResponse.json({ message: '没有需要开奖的活动', processed: 0 });
        }

        console.log('Auto-draw: Found', pendingLotteries.length, 'lotteries past draw date');

        const results: Array<{
            lotteryId: string;
            title: string;
            action: 'drawn' | 'extended' | 'error';
            participants?: number;
            winners?: number;
            newDrawDate?: string;
            error?: string;
        }> = [];

        for (const lottery of pendingLotteries) {
            try {
                // Get actual participant count from lottery_entries
                const { count: actualParticipants, error: countError } = await supabase
                    .from('lottery_entries')
                    .select('*', { count: 'exact', head: true })
                    .eq('lottery_id', lottery.id);

                if (countError) {
                    console.error('Auto-draw: Error counting participants for', lottery.id, countError);
                    results.push({
                        lotteryId: lottery.id,
                        title: lottery.title,
                        action: 'error',
                        error: 'Failed to count participants'
                    });
                    continue;
                }

                const participantCount = actualParticipants || 0;
                const minRequired = lottery.min_participants || 1;

                console.log(`Auto-draw: Lottery "${lottery.title}" - participants: ${participantCount}, min required: ${minRequired}`);

                // Check if we have enough participants
                if (participantCount < minRequired) {
                    // Not enough participants - extend draw date by 1 day
                    const currentDrawDate = new Date(lottery.draw_date);
                    const newDrawDate = new Date(currentDrawDate.getTime() + 24 * 60 * 60 * 1000);

                    const { error: extendError } = await supabase
                        .from('lotteries')
                        .update({ draw_date: newDrawDate.toISOString() })
                        .eq('id', lottery.id);

                    if (extendError) {
                        console.error('Auto-draw: Error extending draw date for', lottery.id, extendError);
                        results.push({
                            lotteryId: lottery.id,
                            title: lottery.title,
                            action: 'error',
                            error: 'Failed to extend draw date'
                        });
                    } else {
                        console.log(`Auto-draw: Extended "${lottery.title}" to ${newDrawDate.toISOString()}`);
                        results.push({
                            lotteryId: lottery.id,
                            title: lottery.title,
                            action: 'extended',
                            participants: participantCount,
                            newDrawDate: newDrawDate.toISOString()
                        });
                    }
                    continue;
                }

                // Enough participants - proceed with draw
                const { data: entries, error: entriesError } = await supabase
                    .from('lottery_entries')
                    .select('user_id, lottery_id')
                    .eq('lottery_id', lottery.id);

                if (entriesError || !entries || entries.length === 0) {
                    console.error('Auto-draw: Error fetching entries for', lottery.id, entriesError);
                    results.push({
                        lotteryId: lottery.id,
                        title: lottery.title,
                        action: 'error',
                        error: 'Failed to fetch entries'
                    });
                    continue;
                }

                // Fisher-Yates shuffle for fair random selection
                const shuffled = [...entries];
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }

                const winnersCount = Math.min(lottery.winners_count, entries.length);
                const winners = shuffled.slice(0, winnersCount);

                console.log(`Auto-draw: Selected ${winnersCount} winners for "${lottery.title}"`);

                // Update each winner using composite key
                let winnersMarked = 0;
                for (const winner of winners) {
                    const { error: updateError, data: updateData } = await supabase
                        .from('lottery_entries')
                        .update({ is_winner: true })
                        .eq('lottery_id', lottery.id)
                        .eq('user_id', winner.user_id)
                        .select();

                    if (!updateError && updateData && updateData.length > 0) {
                        winnersMarked++;
                    } else if (updateError) {
                        console.error('Auto-draw: Error marking winner', winner.user_id, updateError);
                    }
                }

                // Update lottery status
                const { error: statusError } = await supabase
                    .from('lotteries')
                    .update({ status: '已结束' })
                    .eq('id', lottery.id);

                if (statusError) {
                    console.error('Auto-draw: Error updating lottery status for', lottery.id, statusError);
                }

                results.push({
                    lotteryId: lottery.id,
                    title: lottery.title,
                    action: 'drawn',
                    participants: participantCount,
                    winners: winnersMarked
                });

                console.log(`Auto-draw: Completed "${lottery.title}" - ${winnersMarked} winners marked`);
            } catch (err: any) {
                console.error('Auto-draw: Unexpected error for lottery', lottery.id, err);
                results.push({
                    lotteryId: lottery.id,
                    title: lottery.title,
                    action: 'error',
                    error: err.message || 'Unexpected error'
                });
            }
        }

        const drawn = results.filter(r => r.action === 'drawn').length;
        const extended = results.filter(r => r.action === 'extended').length;
        const errors = results.filter(r => r.action === 'error').length;

        return NextResponse.json({
            success: true,
            summary: {
                drawn,
                extended,
                errors,
                total: results.length
            },
            results
        });
    } catch (error: any) {
        console.error('Auto-draw: Fatal error:', error);
        return NextResponse.json({
            error: 'Auto-draw failed',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}

// GET endpoint for easy triggering via browser/cron
export async function GET() {
    return POST();
}
