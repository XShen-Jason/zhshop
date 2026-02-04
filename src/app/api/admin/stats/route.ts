import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/stats
 * Returns transaction statistics for admin dashboard (all in Beijing Time):
 * - Today's revenue (completed orders + ended groups)
 * - Yesterday's revenue
 * - Monthly total revenue
 * - Monthly order count
 * - Group Buy metrics: active count, locked count, ended count, total ended sales
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

        // ========================================
        // Beijing Time Boundaries (UTC+8)
        // ========================================
        // Get current time in Beijing
        const now = new Date();
        const beijingNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));

        // Today 00:00:00 Beijing Time
        const todayBeijing = new Date(beijingNow);
        todayBeijing.setHours(0, 0, 0, 0);

        // Yesterday 00:00:00 Beijing Time
        const yesterdayBeijing = new Date(todayBeijing);
        yesterdayBeijing.setDate(yesterdayBeijing.getDate() - 1);

        // First day of current month 00:00:00 Beijing Time
        const monthStartBeijing = new Date(beijingNow);
        monthStartBeijing.setDate(1);
        monthStartBeijing.setHours(0, 0, 0, 0);

        // Helper: Convert a UTC timestamp to Beijing Date for comparison
        const toBeijingDate = (utcStr: string): Date => {
            const d = new Date(utcStr);
            return new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
        };

        // Helper: Check if a Beijing date is "today"
        const isToday = (beijingDate: Date): boolean => {
            return beijingDate >= todayBeijing;
        };

        // Helper: Check if a Beijing date is "yesterday"
        const isYesterday = (beijingDate: Date): boolean => {
            return beijingDate >= yesterdayBeijing && beijingDate < todayBeijing;
        };

        // Helper: Check if a Beijing date is "this month"
        const isThisMonth = (beijingDate: Date): boolean => {
            return beijingDate >= monthStartBeijing;
        };

        // ========================================
        // Fetch Data
        // ========================================
        // Fetch completed orders only
        const { data: orders } = await supabase
            .from('orders')
            .select('cost, quantity, updated_at')
            .eq('status', '已完成');

        // Fetch all group buys
        const { data: groups } = await supabase
            .from('group_buys')
            .select('id, price, updated_at, status, ended_at');

        // Group counts
        const activeGroupsCount = (groups || []).filter(g => g.status === '进行中').length;
        const lockedGroupsCount = (groups || []).filter(g => g.status === '已锁单').length;
        const endedGroupsCount = (groups || []).filter(g => g.status === '已结束').length;

        // Filter ended groups for revenue calculation
        const endedGroups = (groups || []).filter(g => g.status === '已结束');

        // Get participant quantities for ended groups
        const groupRevenues: { revenue: number; endedAt: string }[] = [];
        if (endedGroups.length > 0) {
            const { data: participants } = await supabase
                .from('group_participants')
                .select('group_id, quantity')
                .in('group_id', endedGroups.map(g => g.id));

            for (const group of endedGroups) {
                const groupParticipants = (participants || []).filter(p => p.group_id === group.id);
                const totalQuantity = groupParticipants.reduce((sum, p) => sum + (p.quantity || 1), 0);
                const revenue = (group.price || 0) * totalQuantity;
                // Use ended_at if exists, otherwise fallback to updated_at
                const endedAt = group.ended_at || group.updated_at;
                groupRevenues.push({ revenue, endedAt });
            }
        }

        // ========================================
        // Calculate Stats
        // ========================================
        let todayRevenue = 0;
        let yesterdayRevenue = 0;
        let monthlyRevenue = 0;
        let monthlyOrderCount = 0;
        let totalEndedGroupSales = 0;

        // Process completed orders
        for (const order of orders || []) {
            const orderTotal = (order.cost || 0) * (order.quantity || 1);
            const orderBeijingDate = toBeijingDate(order.updated_at);

            if (isThisMonth(orderBeijingDate)) {
                monthlyRevenue += orderTotal;
                monthlyOrderCount++;
            }
            if (isToday(orderBeijingDate)) {
                todayRevenue += orderTotal;
            } else if (isYesterday(orderBeijingDate)) {
                yesterdayRevenue += orderTotal;
            }
        }

        // Process ended group revenues
        for (const gr of groupRevenues) {
            totalEndedGroupSales += gr.revenue;
            const groupBeijingDate = toBeijingDate(gr.endedAt);

            if (isThisMonth(groupBeijingDate)) {
                monthlyRevenue += gr.revenue;
            }
            if (isToday(groupBeijingDate)) {
                todayRevenue += gr.revenue;
            } else if (isYesterday(groupBeijingDate)) {
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
