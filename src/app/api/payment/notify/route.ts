
import { NextResponse } from 'next/server';
import { PaymentService } from '@/lib/payment';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const params = Object.fromEntries(searchParams.entries());

        // Verify signature
        if (!PaymentService.verifyNotifySignature(params)) {
            console.error('Payment Notification: Invalid Signature', params);
            return new NextResponse('fail', { status: 400 });
        }

        // Check payment state (1 = success)
        const state = params.state;
        if (state !== '1') {
            console.log('Payment Notification: Payment not successful', params);
            return new NextResponse('success'); // Return success to query to stop retrying? Or fail? Doc says return success to stop.
        }

        const orderNo = params.orderNo; // This is our internal Order ID
        const platformOrderNo = params.platformOrderNo;
        const actualPayAmount = parseFloat(params.actualPayAmount);
        const payType = params.type;

        // Update Order Status
        const supabase = createAdminClient();

        // 1. Check if order exists and is not already paid
        const { data: order, error: fetchError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderNo)
            .single();

        if (fetchError || !order) {
            console.error('Payment Notification: Order not found', orderNo);
            return new NextResponse('success'); // Stop retrying if order doesn't exist
        }

        if (order.status === '已完成') {
            return new NextResponse('success'); // Already processed
        }

        // 2. Update order status
        // Note: We might want to store platform_order_no somewhere, maybe in notes or a new column?
        // For now, we update status to '已完成' (Completed).
        // Also verify amount? The user said "every order is 0.01 for now", so actualPayAmount should be 0.01.
        // We won't strictly validate amount against database cost because of this testing override.

        // Update status
        const { error: updateError } = await supabase
            .from('orders')
            .update({
                status: '已完成',
                updated_at: new Date().toISOString(),
                notes: order.notes ? `${order.notes}\n[Payment] ID: ${platformOrderNo}, Type: ${payType}, Date: ${params.payTime}` : `[Payment] ID: ${platformOrderNo}, Type: ${payType}, Date: ${params.payTime}`
            }) // We don't have pay_info columns yet, so append to notes or just status
            .eq('id', orderNo);

        if (updateError) {
            console.error('Payment Notification: Failed to update order', updateError);
            return new NextResponse('fail', { status: 500 });
        }

        // 3. Award points logic (duplicated from PATCH /api/orders, should be refactored potentially)
        // Since we are using an admin client here, we can trigger points update.
        // Original logic was in PATCH route when admin sets to '已完成'.
        // We should replicate it here.

        const pointsAwarded = Math.floor(order.cost || 0);
        if (pointsAwarded > 0 && order.user_id) {
            const { data: userProfile } = await supabase
                .from('users')
                .select('points')
                .eq('id', order.user_id)
                .single();

            const newPoints = (userProfile?.points || 0) + pointsAwarded;
            await supabase.from('users').update({ points: newPoints }).eq('id', order.user_id);

            await supabase.from('point_logs').insert({
                user_id: order.user_id,
                amount: pointsAwarded,
                type: 'EARN',
                reason: `订单完成奖励 (在线支付)`
            });
        }

        return new NextResponse('success');
    } catch (error) {
        console.error('Payment Notification Error:', error);
        return new NextResponse('fail', { status: 500 });
    }
}
