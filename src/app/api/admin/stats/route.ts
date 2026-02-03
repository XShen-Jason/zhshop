import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/stats
 * Returns transaction statistics for admin dashboard:
 * - Today's revenue (completed orders + groups)
 * - Yesterday's revenue
 * - Monthly total revenue
 * - Monthly order count
 * - Group Buy metrics: active count, ended count, total ended sales
 */
export async function GET() {
    try {
        const supabase = await createClient();

        // Auth & Admin check
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (profile?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Calculate date boundaries (Beijing timezone)
        const now = new Date();
        const beijingOffset = 8 * 60 * 60 * 1000;
        const nowBeijing = new Date(now.getTime() + beijingOffset);

        // Today start (00:00 Beijing time)
        const todayStart = new Date(nowBeijing);
        todayStart.setUTCHours(0, 0, 0, 0);
        const todayStartUtc = new Date(todayStart.getTime() - beijingOffset);

        // Yesterday start
        const yesterdayStart = new Date(todayStartUtc.getTime() - 24 * 60 * 60 * 1000);

        // Month start (1st of current month 00:00 Beijing time)
        const monthStart = new Date(nowBeijing);
        monthStart.setUTCDate(1);
        monthStart.setUTCHours(0, 0, 0, 0);
        const monthStartUtc = new Date(monthStart.getTime() - beijingOffset);

        // Fetch completed orders
        const { data: orders } = await supabase
            .from('orders')
            .select('cost, quantity, updated_at')
            .eq('status', '已完成');

        // Fetch group buys
        const { data: groups } = await supabase
            .from('group_buys')
            .select('id, price, updated_at, status');

        // Fetch counts for active/ended groups
        const activeGroupsCount = (groups || []).filter(g => g.status === '进行中').length;
        const lockedGroupsCount = (groups || []).filter(g => g.status === '已锁单').length;
        const endedGroupsCount = (groups || []).filter(g => g.status === '已结束').length;

        // Filter groups for revenue calcs (Only Ended groups count towards revenue)
        const revenueGroups = (groups || []).filter(g => g.status === '已结束');

        // For each completed group, get participant quantities
        const groupRevenues: { groupId: string; revenue: number; updatedAt: string; status: string }[] = [];
        if (revenueGroups.length > 0) {
            const { data: participants } = await supabase
                .from('group_participants')
                .select('group_id, quantity')
                .in('group_id', revenueGroups.map(g => g.id));

            for (const group of revenueGroups) {
                const groupParticipants = (participants || []).filter(p => p.group_id === group.id);
                const totalQuantity = groupParticipants.reduce((sum, p) => sum + (p.quantity || 1), 0);
                groupRevenues.push({
                    groupId: group.id,
                    revenue: (group.price || 0) * totalQuantity,
                    updatedAt: group.updated_at,
                    status: group.status
                });
            }
        }

        // Calculate stats
        let todayRevenue = 0;
        let yesterdayRevenue = 0;
        let monthlyRevenue = 0;
        let monthlyOrderCount = 0;
        let totalEndedGroupSales = 0;

        // Process orders (calculate total from cost * quantity)
        for (const order of orders || []) {
            const orderTotal = (order.cost || 0) * (order.quantity || 1);
            const orderDate = new Date(order.updated_at);

            if (orderDate >= monthStartUtc) {
                monthlyRevenue += orderTotal;
                monthlyOrderCount++;
            }
            if (orderDate >= todayStartUtc) {
                todayRevenue += orderTotal;
            } else if (orderDate >= yesterdayStart && orderDate < todayStartUtc) {
                yesterdayRevenue += orderTotal;
            }
        }

        // Process group revenues
        for (const gr of groupRevenues) {
            const groupDate = new Date(gr.updatedAt);

            if (gr.status === '已结束') {
                totalEndedGroupSales += gr.revenue;
            }

            if (groupDate >= monthStartUtc) {
                monthlyRevenue += gr.revenue;
                monthlyOrderCount++; // Count each group as one "order" for simplicity
            }
            if (groupDate >= todayStartUtc) {
                todayRevenue += gr.revenue;
            } else if (groupDate >= yesterdayStart && groupDate < todayStartUtc) {
                yesterdayRevenue += gr.revenue;
            }
        }

        return NextResponse.json({
            todayRevenue,
            yesterdayRevenue,
            monthlyRevenue,
            monthlyOrderCount,
            activeGroupsCount,
            lockedGroupsCount,
            endedGroupsCount,
            totalEndedGroupSales
        });

    } catch (error) {
        console.error('Error fetching admin stats:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
