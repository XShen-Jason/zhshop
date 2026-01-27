import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 聚合API：一次请求返回用户的 profile + orders + lotteries + groups
 * 减少用户页面从4次请求到1次
 */
export async function GET() {
    try {
        const supabase = await createClient();

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Fetch all data in parallel
        const [profileResult, ordersResult, lotteriesResult, groupsResult] = await Promise.all([
            // 1. Profile
            supabase.from('users').select('*').eq('id', user.id).single(),

            // 2. Orders (user's own orders only, excluding GROUP type - those show in Groups tab)
            supabase
                .from('orders')
                .select('*')
                .eq('user_id', user.id)
                .neq('item_type', 'GROUP')
                .order('created_at', { ascending: false }),

            // 3. Lottery entries with lottery details
            supabase
                .from('lottery_entries')
                .select(`
                    id,
                    lottery_id,
                    entered_at,
                    is_winner,
                    contact_info,
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
                .order('entered_at', { ascending: false }),

            // 4. Group participations with group details
            supabase
                .from('group_participants')
                .select(`
                    id,
                    group_id,
                    user_id,
                    quantity,
                    contact_info,
                    joined_at,
                    status,
                    group_buys (
                        id,
                        title,
                        price,
                        status,
                        target_count,
                        group_participants(count)
                    )
                `)
                .eq('user_id', user.id)
                .order('joined_at', { ascending: false })
        ]);

        // Transform profile
        const profileData = profileResult.data;
        const profile = profileData ? {
            id: profileData.id,
            name: profileData.name || user.email?.split('@')[0] || 'User',
            email: profileData.email || user.email || '',
            role: profileData.role || 'USER',
            points: profileData.points || 0,
            checkInStreak: profileData.check_in_streak || 0
        } : {
            id: user.id,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            role: 'USER',
            points: 0,
            checkInStreak: 0
        };

        // Transform orders
        const orders = (ordersResult.data || []).map(o => ({
            id: o.id,
            userId: o.user_id,
            itemId: o.item_id,
            itemType: o.item_type,
            itemName: o.item_name,
            status: o.status,
            createdAt: o.created_at,
            contactDetails: o.contact_details,
            notes: o.notes,
            cost: o.cost,
            currency: o.currency,
            quantity: o.quantity || 1
        }));

        // Transform lottery entries
        const lotteries = (lotteriesResult.data || []).map((entry: any) => ({
            id: entry.id,
            lotteryId: entry.lottery_id,
            enteredAt: entry.entered_at,
            isWinner: entry.is_winner,
            contactInfo: entry.contact_info,
            lottery: entry.lotteries ? {
                id: entry.lotteries.id,
                title: entry.lotteries.title,
                status: entry.lotteries.status,
                drawDate: entry.lotteries.draw_date,
                entryCost: entry.lotteries.entry_cost,
                prizes: entry.lotteries.prizes
            } : null
        }));

        // Transform and aggregate group participations
        const groupsAggregated: { [key: string]: any } = {};
        for (const row of groupsResult.data || []) {
            const gid = row.group_id;
            const groupData = row.group_buys as any;
            if (!groupsAggregated[gid]) {
                const liveCount = groupData?.group_participants?.[0]?.count ?? 0;

                groupsAggregated[gid] = {
                    participationId: row.id,
                    groupId: gid,
                    group: groupData ? {
                        id: groupData.id,
                        title: groupData.title,
                        price: groupData.price,
                        status: groupData.status,
                        targetCount: groupData.target_count,
                        currentCount: liveCount
                    } : null,
                    quantity: 0,
                    contactInfo: row.contact_info,
                    joinedAt: row.joined_at,
                    status: row.status || '已加入'
                };
            }
            groupsAggregated[gid].quantity += (row.quantity || 1);
        }

        return NextResponse.json({
            profile,
            orders,
            lotteries,
            groups: Object.values(groupsAggregated)
        });
    } catch (error) {
        console.error('Error fetching user dashboard:', error);
        return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
    }
}
