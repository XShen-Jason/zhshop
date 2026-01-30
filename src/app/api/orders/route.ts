import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
    try {
        const supabase = await createClient();

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json([]);
        }

        // Get user role
        const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        const isAdmin = profile?.role === 'ADMIN';

        let query = supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        // If not admin, only show own orders
        if (!isAdmin) {
            query = query.eq('user_id', user.id);
        } else {
            // Admin view: The user requested to ONLY show product sales in "Orders" tab.
            // "Group Data" should be in Group Management.
            // We exclude item_type 'GROUP'.
            query = query.neq('item_type', 'GROUP');
        }

        const { data, error } = await query;

        if (error) throw error;

        const orders = (data || []).map(o => ({
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
            quantity: o.quantity || 1,
            pay_url: o.pay_url
        }));

        return NextResponse.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const body = await request.json();

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: '请先登录' }, { status: 401 });
        }

        // Validate stock for PRODUCT orders before creating order
        if (body.itemType === 'PRODUCT' && body.itemId) {
            const qty = body.quantity || 1;
            const { data: product } = await supabase
                .from('products')
                .select('stock, in_stock')
                .eq('id', body.itemId)
                .single();

            if (!product || !product.in_stock) {
                return NextResponse.json({ error: '商品已下架' }, { status: 400 });
            }

            if (typeof product.stock === 'number' && product.stock < qty) {
                return NextResponse.json({
                    error: `库存不足，当前库存: ${product.stock}`,
                    availableStock: product.stock
                }, { status: 400 });
            }
        }

        const { data, error } = await supabase
            .from('orders')
            .insert({
                user_id: user?.id || null,
                item_id: body.itemId,
                item_type: body.itemType,
                item_name: body.itemName,
                contact_details: body.contact,
                status: '待联系',
                cost: body.cost,
                currency: body.currency || 'CNY',
                quantity: body.quantity || 1
            })
            .select()
            .single();

        if (error) throw error;

        // Deduct stock for PRODUCT orders
        if (body.itemType === 'PRODUCT' && body.itemId) {
            const qty = body.quantity || 1;
            // Use RPC or direct update to decrement stock
            const { error: stockError } = await supabase.rpc('decrement_product_stock', {
                p_product_id: body.itemId,
                p_quantity: qty
            });
            if (stockError) {
                console.error('Error deducting stock:', stockError);
                // Fallback: direct update if RPC doesn't exist
                const { data: product } = await supabase
                    .from('products')
                    .select('stock')
                    .eq('id', body.itemId)
                    .single();
                if (product) {
                    await supabase
                        .from('products')
                        .update({ stock: Math.max(0, (product.stock || 0) - qty) })
                        .eq('id', body.itemId);
                }
            }
        }

        // Handle Group Buy logic
        if (body.itemType === 'GROUP' && body.itemId) {
            const count = body.quantity || 1;
            let targetGroupId = body.itemId;
            let migratedTo: string | null = null;

            // 获取当前团信息
            const { data: currentGroup } = await supabase
                .from('group_buys')
                .select('*')
                .eq('id', body.itemId)
                .single();

            if (currentGroup) {
                // 获取基础标题
                const baseTitle = currentGroup.title.replace(/ #\d+$/, '');

                // ========== 自动迁移逻辑 ==========
                // 查找同系列中更早创建的、未满员的团
                const { data: earlierUnfilledGroups } = await supabase
                    .from('group_buys')
                    .select('id, title, current_count, target_count, created_at')
                    .ilike('title', `${baseTitle}%`)
                    .neq('status', '已结束')
                    .lt('created_at', currentGroup.created_at)
                    .order('created_at', { ascending: true });

                // 找到第一个有足够空位的早期团
                const eligibleGroup = (earlierUnfilledGroups || []).find(g => {
                    const available = g.target_count - g.current_count;
                    return available >= count;
                });

                if (eligibleGroup) {
                    // 迁移到更早的团
                    targetGroupId = eligibleGroup.id;
                    migratedTo = eligibleGroup.title;
                }
            }

            // Add participants to target group (may be original or migrated)
            const participantRows = Array(count).fill(null).map(() => ({
                group_id: targetGroupId,
                user_id: user?.id || null,
                contact_info: body.contact
            }));

            const { error: participantError } = await supabase
                .from('group_participants')
                .insert(participantRows);

            if (participantError) {
                console.error('Error adding group participants:', participantError);
            } else {
                // 更新目标团人数
                const { data: allParticipants } = await supabase
                    .from('group_participants')
                    .select('quantity')
                    .eq('group_id', targetGroupId);

                const actualCount = (allParticipants || []).reduce(
                    (sum, p) => sum + (p.quantity || 1), 0
                );

                await supabase
                    .from('group_buys')
                    .update({ current_count: actualCount })
                    .eq('id', targetGroupId);

                // 获取目标团完整信息
                const { data: fullGroup } = await supabase
                    .from('group_buys')
                    .select('*')
                    .eq('id', targetGroupId)
                    .single();

                if (fullGroup && actualCount >= fullGroup.target_count) {
                    // 锁团
                    await supabase.from('group_buys').update({ status: '已锁单' }).eq('id', targetGroupId);

                    if (fullGroup.auto_renew) {
                        // 获取基础标题
                        const baseTitle = fullGroup.title.replace(/ #\d+$/, '');

                        // 检查整个系列中是否存在未满员的团
                        const { data: unfilledGroups } = await supabase
                            .from('group_buys')
                            .select('id, title, current_count, target_count')
                            .ilike('title', `${baseTitle}%`)
                            .neq('status', '已结束')
                            .neq('id', targetGroupId);

                        const hasUnfilledGroup = (unfilledGroups || []).some(
                            g => g.current_count < g.target_count
                        );

                        if (!hasUnfilledGroup) {
                            // 计算批次号
                            const { count: groupCount } = await supabase
                                .from('group_buys')
                                .select('*', { count: 'exact', head: true })
                                .ilike('title', `${baseTitle}%`);

                            const batchNumber = (groupCount || 0) + 1;
                            const newTitle = `${baseTitle} #${batchNumber}`;

                            // 创建新团
                            await supabase.from('group_buys').insert({
                                title: newTitle,
                                price: fullGroup.price,
                                description: fullGroup.description,
                                features: fullGroup.features,
                                target_count: fullGroup.target_count,
                                current_count: 0,
                                status: '进行中',
                                auto_renew: true,
                                image_url: fullGroup.image_url,
                                parent_group_id: targetGroupId
                            });
                        }
                    }
                }

                // 如果发生了迁移，检查原始团是否需要删除（变空了）
                if (migratedTo && body.itemId !== targetGroupId) {
                    const { data: originalParticipants } = await supabase
                        .from('group_participants')
                        .select('id')
                        .eq('group_id', body.itemId);

                    if (!originalParticipants || originalParticipants.length === 0) {
                        // 原始团没有参与者了，可以删除
                        // 但保留它作为空团以便后续使用
                        await supabase.from('group_buys').update({ current_count: 0 }).eq('id', body.itemId);
                    }
                }
            }

            // [NEW] Initiate Payment
            let payUrl = null;

            // Only initiate payment for regular products for now (or GROUP if it has a cost > 0)
            // The user said "when user clicks buy... redirect".
            // We should try to create a payment order.

            // Use the amount from the order (though PaymentService will force 0.01 for testing)
            const orderCost = body.cost || 0;

            if (orderCost > 0) {
                // Import dynamically to avoid top-level issues if env not set? No, static import is fine.
                const { PaymentService } = await import('@/lib/payment');
                const paymentResult = await PaymentService.createPaymentOrder(
                    data.id, // Use Order ID as orderNo
                    orderCost,
                    body.itemName || 'Shop Order'
                );

                if (paymentResult && paymentResult.success) {
                    payUrl = paymentResult.payUrl;
                } else {
                    console.error('Failed to create payment order:', paymentResult?.msg);
                    // We still return success: true for the local order, but maybe warn?
                    // Or we should allow the user to 'Pay' later from the order list.
                    // For now, let's just return the local order and if payUrl is missing, the frontend will show "Submitted".
                }
            }

            return NextResponse.json({
                success: true,
                order: data,
                migratedTo: migratedTo,
                targetGroupId: targetGroupId,
                payUrl: payUrl
            });
        }

        // [NEW] Initiate Payment for regular PRODUCT orders too
        let payUrl = null;
        const orderCost = body.cost || 0;
        let paymentError = null;
        console.log('[DEBUG] Order initiated. Type:', body.itemType, 'Cost:', orderCost);

        if (orderCost > 0) {
            console.log('[DEBUG] Attempting payment creation for order:', data.id);
            try {
                const { PaymentService } = await import('@/lib/payment');
                const paymentResult = await PaymentService.createPaymentOrder(
                    data.id,
                    orderCost,
                    body.itemName || 'Product Order'
                );
                console.log('[DEBUG] Payment result:', paymentResult);

                if (paymentResult && paymentResult.success) {
                    payUrl = paymentResult.payUrl;
                    // Update order with payUrl and set status to '待支付' (Pending Payment)
                    await supabase.from('orders').update({
                        status: '待支付',
                        pay_url: payUrl,
                        notes: `[Payment] 支付链接已生成`
                    }).eq('id', data.id);
                } else {
                    console.error('[DEBUG] Payment creation failed:', paymentResult);
                    paymentError = paymentResult?.msg || 'Payment failed';
                }
            } catch (err) {
                console.error('[DEBUG] Payment import/exec error:', err);
                paymentError = 'Internal Server Error during payment';
            }
        } else {
            console.log('[DEBUG] Cost is 0 or less, skipping payment.');
        }

        return NextResponse.json({ success: true, order: data, payUrl: payUrl, paymentError });
    } catch (error) {
        console.error('Error creating order:', error);
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const supabase = await createClient();
        const body = await request.json();
        const { id, status } = body;

        // Parallel: Get user auth + order data at the same time
        const [authResult, orderResult] = await Promise.all([
            supabase.auth.getUser(),
            supabase.from('orders').select('*').eq('id', id).single()
        ]);

        const user = authResult.data?.user;
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check admin role
        const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const order = orderResult.data;

        const { error } = await supabase
            .from('orders')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;

        if (error) throw error;

        // [NEW] Award points if status changed to '已完成'
        if (status === '已完成' && order && order.status !== '已完成') {
            const pointsAwarded = Math.floor(order.cost || 0);
            if (pointsAwarded > 0 && order.user_id) {
                // Use Admin Client to bypass RLS
                const adminClient = createAdminClient();

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
                const { error: logError } = await adminClient.from('point_logs').insert({
                    user_id: order.user_id,
                    amount: pointsAwarded,
                    type: 'EARN',
                    reason: `订单完成奖励`
                });

                if (logError) {
                    console.error('Failed to insert point log:', logError);
                }
            }
        }

        // Restore stock if admin cancels a PRODUCT order using RPC
        if (status === '已取消' && order && order.item_type === 'PRODUCT' && order.item_id) {
            const qty = order.quantity || 1;
            const { error: stockError } = await supabase.rpc('adjust_product_stock', {
                p_product_id: order.item_id,
                p_quantity_change: qty
            });
            if (stockError) {
                console.error('Error restoring stock on admin cancel:', stockError);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating order:', error);
        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }
}

// PUT - User modifies their own order (only when status is '待联系')
export async function PUT(request: Request) {
    try {
        const supabase = await createClient();
        const body = await request.json();
        const { id, quantity, contact } = body;

        // Check authentication
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: '请先登录' }, { status: 401 });
        }

        // Get the order and verify ownership
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', id)
            .single();

        if (orderError || !order) {
            return NextResponse.json({ error: '订单不存在' }, { status: 404 });
        }

        // Verify ownership
        if (order.user_id !== user.id) {
            return NextResponse.json({ error: '无权修改此订单' }, { status: 403 });
        }

        // Can only modify orders with status '待联系'
        if (order.status !== '待联系') {
            return NextResponse.json({ error: '订单已在处理中，无法修改' }, { status: 400 });
        }

        // Build update data
        const updateData: any = { updated_at: new Date().toISOString() };
        const oldQuantity = order.quantity || 1;
        let newQuantity = oldQuantity;

        if (quantity !== undefined && quantity >= 1) {
            newQuantity = quantity;
            updateData.quantity = quantity;
            // Update total cost if quantity changes
            if (order.cost && order.item_type === 'PRODUCT') {
                const unitPrice = order.cost / oldQuantity;
                updateData.cost = unitPrice * quantity;
            }
        }
        if (contact !== undefined) {
            updateData.contact_details = contact;
        }

        // Adjust stock for PRODUCT orders if quantity changed
        if (order.item_type === 'PRODUCT' && order.item_id && newQuantity !== oldQuantity) {
            const stockDiff = oldQuantity - newQuantity; // positive if reducing order, negative if increasing

            // Validate if increasing order quantity
            if (stockDiff < 0) {
                const { data: product } = await supabase
                    .from('products')
                    .select('stock')
                    .eq('id', order.item_id)
                    .single();

                if (product && (product.stock || 0) + stockDiff < 0) {
                    return NextResponse.json({
                        error: `库存不足，当前库存: ${product.stock}`,
                        availableStock: product.stock
                    }, { status: 400 });
                }
            }

            // Use RPC to adjust stock (bypasses RLS with SECURITY DEFINER)
            const { error: stockError } = await supabase.rpc('adjust_product_stock', {
                p_product_id: order.item_id,
                p_quantity_change: stockDiff
            });
            if (stockError) {
                console.error('Error adjusting stock:', stockError);
            }
        }

        const { error } = await supabase
            .from('orders')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error modifying order:', error);
        return NextResponse.json({ error: '修改订单失败' }, { status: 500 });
    }
}

// DELETE - User cancels their own order (only when status is '待联系')
export async function DELETE(request: Request) {
    try {
        const supabase = await createClient();
        const body = await request.json();
        const { id } = body;

        // Check authentication
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: '请先登录' }, { status: 401 });
        }

        // Get the order and verify ownership
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', id)
            .single();

        if (orderError || !order) {
            return NextResponse.json({ error: '订单不存在' }, { status: 404 });
        }

        // Verify ownership
        if (order.user_id !== user.id) {
            return NextResponse.json({ error: '无权取消此订单' }, { status: 403 });
        }

        // Can only cancel orders with status '待联系'
        if (order.status !== '待联系') {
            return NextResponse.json({ error: '订单已在处理中，无法取消' }, { status: 400 });
        }

        // Update order status to cancelled instead of deleting
        const { error } = await supabase
            .from('orders')
            .update({ status: '已取消', updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;

        // Restore stock for PRODUCT orders using RPC (bypasses RLS)
        if (order.item_type === 'PRODUCT' && order.item_id) {
            const qty = order.quantity || 1;
            const { error: stockError } = await supabase.rpc('adjust_product_stock', {
                p_product_id: order.item_id,
                p_quantity_change: qty // positive = restore stock
            });
            if (stockError) {
                console.error('Error restoring stock:', stockError);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error canceling order:', error);
        return NextResponse.json({ error: '取消订单失败' }, { status: 500 });
    }
}
