import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PaymentService } from '@/lib/payment';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { orderId } = body;

        if (!orderId) {
            return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
        }

        // Verify order belongs to user
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .eq('user_id', user.id)
            .single();

        if (orderError || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Check status with Payment FM
        // Using order.id as orderNo since that's what we used to create it (or check order.order_no column if exists)
        // In createPaymentOrder, we passed `data.id` (UUID) as `orderNo`.
        const queryResult = await PaymentService.queryOrder(order.id);

        if (queryResult && queryResult.success) {
            if (queryResult.status === '4') { // 4 = Paid Success
                // Update order to completed if not already
                if (order.status !== '已完成') {
                    const { error: updateError } = await supabase
                        .from('orders')
                        .update({
                            status: '已完成',
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', orderId);

                    if (updateError) {
                        console.error('Failed to update order status:', updateError);
                        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
                    }

                    // [NEW] Award points logic (duplicated from notify/orders route)
                    // We need to use admin client to update user points if RLS blocks it,
                    // but here we are logged in as the user. Users usually can't update their own points.
                    // So we might need createAdminClient if RLS is strict.
                    // Let's import createAdminClient to be safe.
                    const { createAdminClient } = await import('@/lib/supabase/admin');
                    const adminClient = createAdminClient();

                    const pointsAwarded = Math.floor(order.cost || 0);
                    if (pointsAwarded > 0 && order.user_id) {
                        // 1. Get current points
                        const { data: userProfile } = await adminClient
                            .from('users')
                            .select('points')
                            .eq('id', order.user_id)
                            .single();

                        // 2. Update points
                        const newPoints = (userProfile?.points || 0) + pointsAwarded;
                        await adminClient.from('users').update({ points: newPoints }).eq('id', order.user_id);

                        // 3. Log
                        await adminClient.from('point_logs').insert({
                            user_id: order.user_id,
                            amount: pointsAwarded,
                            type: 'EARN',
                            reason: `订单完成奖励 (手动查询)`
                        });
                    }

                    return NextResponse.json({
                        paid: true,
                        updated: true,
                        message: '支付成功，订单已更新'
                    });
                }
                return NextResponse.json({
                    paid: true,
                    updated: false,
                    message: '订单已是支付成功状态'
                });
            } else {
                return NextResponse.json({
                    paid: false,
                    statusDesc: queryResult.statusDesc,
                    message: `支付状态: ${queryResult.statusDesc}`
                });
            }
        } else {
            return NextResponse.json({ error: queryResult?.msg || 'Query failed' }, { status: 400 });
        }

    } catch (error) {
        console.error('Check payment error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
