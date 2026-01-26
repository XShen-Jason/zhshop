import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PUT - Update contact info for an order
export async function PUT(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { orderId, contactDetails } = body;

        if (!orderId || !contactDetails) {
            return NextResponse.json({ error: 'Missing orderId or contactDetails' }, { status: 400 });
        }

        // Verify ownership
        const { data: order } = await supabase
            .from('orders')
            .select('id, user_id')
            .eq('id', orderId)
            .single();

        if (!order || order.user_id !== user.id) {
            return NextResponse.json({ error: '订单不存在或无权限' }, { status: 403 });
        }

        // Update contact details
        const { error } = await supabase
            .from('orders')
            .update({ contact_details: contactDetails })
            .eq('id', orderId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating order contact:', error);
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}
