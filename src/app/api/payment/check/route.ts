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
                // Update order to 'Completed' (for digital auto-delivery) or '待联系' (for manual)
                // Since this system seems to rely on manual 'Wait for Contact' for products:
                // If it is a PRODUCT, set to '待联系'
                // If the logic in notify was: Product -> '待联系'.

                let newStatus = 'Completed';
                if (order.item_type === 'PRODUCT') {
                    newStatus = '待联系';
                }

                if (order.status !== newStatus && order.status !== 'Completed') {
                    // Use Admin Client to bypass RLS for status update
                    const { createAdminClient } = await import('@/lib/supabase/admin');
                    const adminClient = createAdminClient();

                    const { error: updateError } = await adminClient
                        .from('orders')
                        .update({
                            status: newStatus,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', orderId);

                    if (updateError) {
                        console.error('Failed to update order status:', updateError);
                        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
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
                    message: `订单已支付 (${order.status})`
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
