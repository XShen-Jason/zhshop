import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // Auth & Admin check
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (profile?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await request.json();
        const { lotteryId } = body;

        if (!lotteryId) {
            return NextResponse.json({ error: '缺少抽奖ID' }, { status: 400 });
        }

        // Get lottery details
        const { data: lottery, error: lotteryError } = await supabase
            .from('lotteries')
            .select('*')
            .eq('id', lotteryId)
            .single();

        if (lotteryError || !lottery) {
            console.error('Lottery not found:', lotteryId, lotteryError);
            return NextResponse.json({ error: '抽奖不存在' }, { status: 404 });
        }

        if (lottery.status === '已结束') {
            return NextResponse.json({ error: '该抽奖已开奖' }, { status: 400 });
        }

        // Get all entries for this lottery
        const { data: entries, error: entriesError } = await supabase
            .from('lottery_entries')
            .select('user_id, lottery_id, is_winner')
            .eq('lottery_id', lotteryId);

        if (entriesError) {
            console.error('Error fetching entries:', entriesError);
            throw entriesError;
        }

        const participantCount = entries?.length || 0;
        const minParticipants = lottery.min_participants || 1;

        console.log('Lottery draw check - participants:', participantCount, 'min required:', minParticipants, 'winners_count:', lottery.winners_count);

        // Check minimum participants requirement
        if (participantCount < minParticipants) {
            return NextResponse.json({
                error: `参与人数不足，需要至少 ${minParticipants} 人参与才能开奖，当前只有 ${participantCount} 人`,
                cannotDraw: true,
                currentParticipants: participantCount,
                minRequired: minParticipants
            }, { status: 400 });
        }

        if (participantCount === 0) {
            // No participants - just close the lottery
            await supabase
                .from('lotteries')
                .update({ status: '已结束' })
                .eq('id', lotteryId);

            return NextResponse.json({
                success: true,
                winnersCount: 0,
                message: '无参与者，抽奖已结束'
            });
        }

        // Calculate actual winners count (can't have more winners than participants)
        const winnersCount = Math.min(lottery.winners_count, participantCount);

        console.log('Will select', winnersCount, 'winners from', participantCount, 'participants');

        // Fisher-Yates shuffle for fair random selection
        const shuffled = [...entries!];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const winners = shuffled.slice(0, winnersCount);

        console.log('Selected winners:', JSON.stringify(winners.map(w => w.user_id)));

        // Update each winner - try direct update without RLS check first
        let successfulUpdates = 0;
        const updateErrors: string[] = [];

        for (const winner of winners) {
            console.log('Attempting to mark winner:', winner.user_id);

            // Use rpc or direct update
            const { data: updateData, error: updateError } = await supabase
                .from('lottery_entries')
                .update({ is_winner: true })
                .eq('lottery_id', lotteryId)
                .eq('user_id', winner.user_id)
                .select('user_id, is_winner');

            console.log('Update result for', winner.user_id, '- data:', JSON.stringify(updateData), 'error:', updateError);

            if (updateError) {
                console.error('Update error:', updateError);
                updateErrors.push(`${winner.user_id}: ${updateError.message}`);
            } else if (updateData && updateData.length > 0 && updateData[0].is_winner === true) {
                successfulUpdates++;
                console.log('Successfully marked winner:', winner.user_id);
            } else {
                console.error('Update did not apply for:', winner.user_id, 'returned data:', updateData);
                updateErrors.push(`${winner.user_id}: Update returned but is_winner not set`);
            }
        }

        // Update lottery status
        const { error: statusError } = await supabase
            .from('lotteries')
            .update({ status: '已结束' })
            .eq('id', lotteryId);

        if (statusError) {
            console.error('Error updating lottery status:', statusError);
            throw statusError;
        }

        // Final verification
        const { data: verifyWinners } = await supabase
            .from('lottery_entries')
            .select('user_id, is_winner')
            .eq('lottery_id', lotteryId)
            .eq('is_winner', true);

        console.log('Final verification - winners in DB:', JSON.stringify(verifyWinners));

        // If no winners were marked but we should have winners, there's an RLS issue
        if (successfulUpdates === 0 && winnersCount > 0) {
            console.error('RLS ISSUE DETECTED: No winners were marked despite having participants');
            console.error('Update errors:', updateErrors);
            return NextResponse.json({
                success: false,
                error: '中奖者标记失败，请检查数据库权限设置（RLS策略）',
                details: updateErrors,
                hint: '请运行 migrations/fix_lottery_rls.sql 修复权限问题'
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            winnersCount: successfulUpdates,
            totalParticipants: participantCount,
            verifiedWinners: verifyWinners?.length || 0
        });
    } catch (error) {
        console.error('Error executing lottery draw:', error);
        return NextResponse.json({ error: 'Failed to execute draw' }, { status: 500 });
    }
}
