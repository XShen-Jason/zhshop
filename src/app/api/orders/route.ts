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
            .select('*, users(saved_contacts)')
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

        const { data: ordersData, error } = await query;

        if (error) throw error;

        // Fetch product details for category info if needed
        // Since Supabase simple join on polymorphic item_id is hard, we fetch products separately
        let productMap = new Map();
        if (isAdmin) {
            const productIds = (ordersData || [])
                .filter(o => o.item_type === 'PRODUCT')
                .map(o => o.item_id);

            if (productIds.length > 0) {
                // Use Admin Client to ensure we can see all products regardless of status
                const adminClient = createAdminClient();
                const { data: products } = await adminClient
                    .from('products')
                    .select('id, category, sub_category')
                    .in('id', productIds);

                products?.forEach(p => productMap.set(p.id, p));
            }
        }

        const orders = (ordersData || []).map(o => {
            let category = '其他';
            let subCategory = '其他';

            if (o.item_type === 'PRODUCT') {
                const p = productMap.get(o.item_id);
                if (p) {
                    category = p.category || '未分类';
                    subCategory = p.sub_category || '未分类';
                } else {
                    category = '商品'; // Default for product if not found
                }
            } else if (o.item_type === 'LOTTERY') {
                category = '抽奖';
            } else if (o.item_type === 'GROUP') {
                category = '拼团';
            }

            return {
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
                savedContacts: o.users?.saved_contacts || [],
                category,
                subCategory
            };
        });

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
            // Use Admin Client for all Group operations to bypass RLS on system tables
            const adminClient = createAdminClient();

            const count = body.quantity || 1;
            let targetGroupId = body.itemId;
            let migratedTo: string | null = null;

            // 获取当前团信息
            const { data: currentGroup } = await adminClient
                .from('group_buys')
                .select('*')
                .eq('id', body.itemId)
                .single();

            if (currentGroup) {
                // 获取基础标题
                const baseTitle = currentGroup.title.replace(/ #\d+$/, '');

                // ========== 自动迁移逻辑 ==========
                // 查找同系列中更早创建的、未满员的团
                const { data: earlierUnfilledGroups } = await adminClient
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

            // Add single participant record with quantity
            const { error: participantError } = await adminClient
                .from('group_participants')
                .insert({
                    group_id: targetGroupId,
                    user_id: user?.id || null, // Authenticated user ID
                    contact_info: body.contact,
                    quantity: count
                });

            if (participantError) {
                console.error('Error adding group participants:', participantError);
            } else {
                // 更新目标团人数
                const { data: allParticipants } = await adminClient
                    .from('group_participants')
                    .select('quantity')
                    .eq('group_id', targetGroupId);

                const actualCount = (allParticipants || []).reduce(
                    (sum, p) => sum + (p.quantity || 1), 0
                );

                await adminClient
                    .from('group_buys')
                    .update({ current_count: actualCount })
                    .eq('id', targetGroupId);

                // 获取目标团完整信息
                const { data: fullGroup } = await adminClient
                    .from('group_buys')
                    .select('*')
                    .eq('id', targetGroupId)
                    .single();

                if (fullGroup && actualCount >= fullGroup.target_count) {
                    // 锁团
                    await adminClient.from('group_buys').update({ status: '已锁单' }).eq('id', targetGroupId);

                    if (fullGroup.auto_renew) {
                        // 获取基础标题
                        const baseTitle = fullGroup.title.replace(/ #\d+$/, '');

                        // 检查整个系列中是否存在未满员的团
                        const { data: unfilledGroups } = await adminClient
                            .from('group_buys')
                            .select('id, title, current_count, target_count')
                            .ilike('title', `${baseTitle}%`)
                            .neq('status', '已结束')
                            .neq('id', targetGroupId); // Exclude self

                        const hasUnfilledGroup = (unfilledGroups || []).some(
                            g => g.current_count < g.target_count
                        );

                        if (!hasUnfilledGroup) {
                            // 计算批次号
                            const { count: groupCount } = await adminClient
                                .from('group_buys')
                                .select('*', { count: 'exact', head: true })
                                .ilike('title', `${baseTitle}%`);

                            const batchNumber = (groupCount || 0) + 1;
                            const newTitle = `${baseTitle} #${batchNumber}`;

                            // 创建新团
                            await adminClient.from('group_buys').insert({
                                title: newTitle,
                                price: fullGroup.price,
                                description: fullGroup.description,
                                features: fullGroup.features,
                                target_count: fullGroup.target_count,
                                current_count: 0,
                                status: '进行中',
                                auto_renew: true,
                                image_url: fullGroup.image_url,
                                is_hot: fullGroup.is_hot, // Inherit hot status
                                parent_group_id: targetGroupId
                            });
                        }
                    }
                }

                // 如果发生了迁移，检查原始团是否需要删除（变空了）
                if (migratedTo && body.itemId !== targetGroupId) {
                    const { count: originalParticipantsCount } = await adminClient
                        .from('group_participants')
                        .select('*', { count: 'exact', head: true })
                        .eq('group_id', body.itemId);

                    if (originalParticipantsCount === 0) {
                        // 原始团没有参与者了，且不是目标团，重置它或不做处理（防止其变成死团）
                        // 这里我们选择将计数必须归零（虽然是新的应该本来就是0，但为了保险）
                        await adminClient.from('group_buys').update({ current_count: 0 }).eq('id', body.itemId);
                    }
                }
            }

            return NextResponse.json({
                success: true,
                order: data,
                migratedTo: migratedTo,
                targetGroupId: targetGroupId
            });
        }

        return NextResponse.json({ success: true, order: data });
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

        // Get current user to verify Admin
        const { data: { user } } = await supabase.auth.getUser();

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

        // Use Admin Client for database operations
        const adminClient = createAdminClient();

        // Get order first
        const { data: order, error: fetchError } = await adminClient
            .from('orders')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Update Status
        const { error } = await adminClient
            .from('orders')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;

        // Award points if status changed to '已完成'
        if (status === '已完成' && order.status !== '已完成') {
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
                const { error: logError } = await adminClient.from('point_logs').insert({
                    user_id: order.user_id,
                    amount: pointsAwarded,
                    type: 'EARN',
                    reason: `订单完成奖励`
                });

                if (logError) console.error('Failed to insert point log:', logError);
            }
        }

        // Restore stock if admin cancels a PRODUCT order
        // Note: RPC might be on public schema, but adminClient can call it too.
        // Simplest is to just update via adminClient if we know the stock math, OR call RPC via supabase client if permitted.
        // Let's use RPC via adminClient or simple update. adminClient doesn't support .rpc() same way? It does.
        if (status === '已取消' && order.item_type === 'PRODUCT' && order.item_id) {
            const qty = order.quantity || 1;
            const { error: stockError } = await adminClient.rpc('adjust_product_stock', {
                p_product_id: order.item_id,
                p_quantity_change: qty
            });
            if (stockError) {
                console.error('Error restoring stock on admin cancel:', stockError);
                // Fallback manual update
                const { data: product } = await adminClient.from('products').select('stock').eq('id', order.item_id).single();
                if (product) {
                    await adminClient.from('products').update({ stock: (product.stock || 0) + qty }).eq('id', order.item_id);
                }
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

// DELETE - handles both User cancel and Admin delete/cancel
export async function DELETE(request: Request) {
    try {
        const supabase = await createClient();
        const body = await request.json();
        const { id, action } = body; // action: 'delete' | 'cancel' (admin only), undefined = user cancel

        // Check authentication
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: '请先登录' }, { status: 401 });
        }

        // Get user role
        const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        const isAdmin = profile?.role === 'ADMIN';

        // Use Admin Client for all operations
        const adminClient = createAdminClient();

        // Get the order
        const { data: order, error: orderError } = await adminClient
            .from('orders')
            .select('*')
            .eq('id', id)
            .single();

        if (orderError || !order) {
            return NextResponse.json({ error: '订单不存在' }, { status: 404 });
        }

        // ========== ADMIN ACTIONS ==========
        if (isAdmin && action) {
            if (action === 'delete') {
                // Soft delete: just mark as '已删除', no stock/points changes
                const { error } = await adminClient
                    .from('orders')
                    .update({ status: '已删除', updated_at: new Date().toISOString() })
                    .eq('id', id);

                if (error) throw error;
                return NextResponse.json({ success: true, message: '订单已删除' });
            }

            if (action === 'cancel') {
                // Cancel: restore stock + refund points + set to '已取消'

                // 1. Restore stock for PRODUCT orders
                if (order.item_type === 'PRODUCT' && order.item_id) {
                    const qty = order.quantity || 1;
                    const { error: stockError } = await adminClient.rpc('adjust_product_stock', {
                        p_product_id: order.item_id,
                        p_quantity_change: qty
                    });
                    if (stockError) {
                        console.error('Error restoring stock:', stockError);
                        // Fallback manual update
                        const { data: product } = await adminClient.from('products').select('stock').eq('id', order.item_id).single();
                        if (product) {
                            await adminClient.from('products').update({ stock: (product.stock || 0) + qty }).eq('id', order.item_id);
                        }
                    }
                }

                // 2. Refund points if order was completed (points were awarded)
                if (order.status === '已完成' && order.user_id) {
                    const pointsToRefund = Math.floor(order.cost || 0);
                    if (pointsToRefund > 0) {
                        // Get current points
                        const { data: userProfile } = await adminClient
                            .from('users')
                            .select('points')
                            .eq('id', order.user_id)
                            .single();

                        // Deduct points (but don't go negative)
                        const newPoints = Math.max(0, (userProfile?.points || 0) - pointsToRefund);
                        await adminClient.from('users').update({ points: newPoints }).eq('id', order.user_id);

                        // Log the refund
                        await adminClient.from('point_logs').insert({
                            user_id: order.user_id,
                            amount: -pointsToRefund,
                            type: 'DEDUCT',
                            reason: `订单取消，积分退回`
                        });
                    }
                }

                // 3. Update order status
                const { error } = await adminClient
                    .from('orders')
                    .update({ status: '已取消', updated_at: new Date().toISOString() })
                    .eq('id', id);

                if (error) throw error;
                return NextResponse.json({ success: true, message: '订单已取消，库存和积分已恢复' });
            }

            return NextResponse.json({ error: '无效的操作类型' }, { status: 400 });
        }

        // ========== USER CANCEL (existing logic) ==========
        // Verify ownership
        if (order.user_id !== user.id) {
            return NextResponse.json({ error: '无权取消此订单' }, { status: 403 });
        }

        // Can only cancel orders with status '待联系'
        if (order.status !== '待联系') {
            return NextResponse.json({ error: '订单已在处理中，无法取消' }, { status: 400 });
        }

        // Update order status to cancelled
        const { error } = await supabase
            .from('orders')
            .update({ status: '已取消', updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;

        // Restore stock for PRODUCT orders
        if (order.item_type === 'PRODUCT' && order.item_id) {
            const qty = order.quantity || 1;
            const { error: stockError } = await supabase.rpc('adjust_product_stock', {
                p_product_id: order.item_id,
                p_quantity_change: qty
            });
            if (stockError) {
                console.error('Error restoring stock:', stockError);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in DELETE order:', error);
        return NextResponse.json({ error: '操作失败' }, { status: 500 });
    }
}
