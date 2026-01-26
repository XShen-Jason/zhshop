import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET user's group participation records
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json([]);
        }

        // Fetch all group participations for this user with live count
        const { data, error } = await supabase
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
            .order('joined_at', { ascending: false });

        if (error) throw error;

        // Aggregate by group_id to combine multiple rows from same user in same group
        const aggregated: { [key: string]: any } = {};
        for (const row of data || []) {
            const gid = row.group_id;
            const groupData = row.group_buys as any;
            if (!aggregated[gid]) {
                // Get live count from participants relation
                const liveCount = groupData?.group_participants?.[0]?.count ?? 0;

                aggregated[gid] = {
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
            aggregated[gid].quantity += (row.quantity || 1);
        }

        return NextResponse.json(Object.values(aggregated));
    } catch (error) {
        console.error('Error fetching user groups:', error);
        return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
    }
}

// PUT - Update user's participation (modify quantity and/or contact info)
export async function PUT(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { groupId, newQuantity, contactInfo } = body;

        if (!groupId) {
            return NextResponse.json({ error: 'Missing groupId' }, { status: 400 });
        }

        // Get current entries for this user in this group
        const { data: currentEntries, error: fetchError } = await supabase
            .from('group_participants')
            .select('id, quantity, contact_info')
            .eq('group_id', groupId)
            .eq('user_id', user.id);

        if (fetchError) throw fetchError;

        const currentTotal = (currentEntries || []).reduce((sum, e) => sum + (e.quantity || 1), 0);

        // Update contact info for all entries if provided
        if (contactInfo !== undefined && currentEntries && currentEntries.length > 0) {
            const ids = currentEntries.map(e => e.id);
            await supabase
                .from('group_participants')
                .update({ contact_info: contactInfo })
                .in('id', ids);
        }

        // If newQuantity not provided, just return success (contact-only update)
        if (newQuantity === undefined) {
            return NextResponse.json({ success: true });
        }

        const diff = newQuantity - currentTotal;

        if (diff === 0) {
            return NextResponse.json({ success: true, message: 'No change' });
        }

        // Get group info for validation
        const { data: group } = await supabase
            .from('group_buys')
            .select('current_count, target_count, status')
            .eq('id', groupId)
            .single();

        // 只有已结束才完全禁止修改
        if (!group || group.status === '已结束') {
            return NextResponse.json({ error: '该团已结束，无法修改' }, { status: 400 });
        }

        // 动态判断是否满员（不依赖已存储的status，避免状态过时问题）
        const isActuallyFull = (group.current_count || 0) >= group.target_count;

        // 如果当前实际已满，且用户要增加数量，拒绝
        if (isActuallyFull && diff > 0) {
            return NextResponse.json({ error: '该团已满员，无法增加数量' }, { status: 400 });
        }

        if (diff > 0) {
            // User wants to increase - check room
            const available = group.target_count - (group.current_count || 0);
            if (diff > available) {
                return NextResponse.json({ error: `名额不足，最多可增加 ${available} 个` }, { status: 400 });
            }
            // Add new rows with contact info
            const newRows = Array(diff).fill(null).map(() => ({
                group_id: groupId,
                user_id: user.id,
                contact_info: contactInfo || currentEntries?.[0]?.contact_info || null
            }));
            await supabase.from('group_participants').insert(newRows);

            // Update group count
            const newCount = (group.current_count || 0) + diff;
            await supabase.from('group_buys').update({
                current_count: newCount
            }).eq('id', groupId);

            // ========== 自动开团逻辑 ==========
            // 检查是否满员，如果满员且开启了auto_renew则自动创建下一团
            if (newCount >= group.target_count) {
                // 获取完整的团信息（包括auto_renew等字段）
                const { data: fullGroup } = await supabase
                    .from('group_buys')
                    .select('*')
                    .eq('id', groupId)
                    .single();

                if (fullGroup) {
                    // 锁团
                    await supabase.from('group_buys').update({ status: '已锁单' }).eq('id', groupId);

                    if (fullGroup.auto_renew) {
                        // 获取基础标题（去掉 #N 后缀）
                        const baseTitle = fullGroup.title.replace(/ #\d+$/, '');

                        // 检查整个系列中是否存在未满员的团
                        // 自动开团只在系列中没有任何未满团时才触发
                        const { data: unfilledGroups } = await supabase
                            .from('group_buys')
                            .select('id, title, current_count, target_count')
                            .ilike('title', `${baseTitle}%`)
                            .neq('status', '已结束')
                            .neq('id', groupId);  // 排除当前团

                        // 检查是否有任何未满员的团
                        const hasUnfilledGroup = (unfilledGroups || []).some(
                            g => g.current_count < g.target_count
                        );

                        if (!hasUnfilledGroup) {
                            // 计算批次号
                            const { count } = await supabase
                                .from('group_buys')
                                .select('*', { count: 'exact', head: true })
                                .ilike('title', `${baseTitle}%`);

                            const batchNumber = (count || 0) + 1;
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
                                parent_group_id: groupId
                            });
                        }
                    }
                }
            }

        } else if (diff < 0) {
            // User wants to decrease (diff is negative)
            const toRemove = Math.abs(diff);
            if (toRemove >= currentTotal) {
                return NextResponse.json({ error: '不能减少到0，请使用取消参与功能' }, { status: 400 });
            }

            // Remove some entries (FIFO by id)
            const idsToRemove = currentEntries!.slice(0, toRemove).map(e => e.id);
            await supabase.from('group_participants').delete().in('id', idsToRemove);

            // Update group count and status
            const newCount = Math.max(0, (group.current_count || 0) - toRemove);
            const newStatus = newCount >= group.target_count ? '已锁单' : '进行中';
            await supabase.from('group_buys').update({
                current_count: newCount,
                status: newStatus
            }).eq('id', groupId);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating participation:', error);
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}

// DELETE - Cancel participation entirely (with migration logic)
export async function DELETE(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { groupId } = body;

        if (!groupId) {
            return NextResponse.json({ error: 'Missing groupId' }, { status: 400 });
        }

        // Get group info including target_count for migration logic
        const { data: group } = await supabase
            .from('group_buys')
            .select('id, current_count, target_count, status, parent_group_id')
            .eq('id', groupId)
            .single();

        if (!group) {
            return NextResponse.json({ error: '拼团不存在' }, { status: 404 });
        }

        // 锁团后仍可取消，但需要触发迁移逻辑
        // 只有"已结束"状态才完全禁止修改
        if (group.status === '已结束') {
            return NextResponse.json({ error: '该团已结束，无法取消' }, { status: 400 });
        }

        // Get user's entries to remove
        const { data: userEntries } = await supabase
            .from('group_participants')
            .select('id, quantity')
            .eq('group_id', groupId)
            .eq('user_id', user.id);

        const countToRemove = (userEntries || []).reduce((sum, e) => sum + (e.quantity || 1), 0);

        if (countToRemove === 0) {
            return NextResponse.json({ error: '您未参与此团' }, { status: 400 });
        }

        // Delete user's entries
        const { error: deleteError } = await supabase
            .from('group_participants')
            .delete()
            .eq('group_id', groupId)
            .eq('user_id', user.id);

        if (deleteError) throw deleteError;

        // Calculate new count after removal
        let newCount = Math.max(0, (group.current_count || 0) - countToRemove);
        const targetCount = group.target_count || 1;

        // ========== 迁移逻辑 ==========
        // 查找子团 (parent_group_id = 当前团id 的最新未结束团)
        const { data: childGroups } = await supabase
            .from('group_buys')
            .select('id')
            .eq('parent_group_id', groupId)
            .neq('status', '已结束')
            .order('created_at', { ascending: false })
            .limit(1);

        const childGroup = childGroups?.[0];

        if (childGroup && newCount < targetCount) {
            // 存在子团且本团未满，执行迁移
            const availableSlots = targetCount - newCount;

            // 获取子团的所有参与者，按参与时间排序
            const { data: childParticipants } = await supabase
                .from('group_participants')
                .select('id, user_id, quantity, contact_info, joined_at')
                .eq('group_id', childGroup.id)
                .order('joined_at', { ascending: true });

            if (childParticipants && childParticipants.length > 0) {
                // 聚合同一用户的多条记录（同一用户可能有多行）
                const userMap = new Map<string, { ids: string[], totalQty: number, contact_info: string, joined_at: string }>();

                for (const p of childParticipants) {
                    const key = p.user_id || p.id; // 匿名用户用记录id作为key
                    if (!userMap.has(key)) {
                        userMap.set(key, {
                            ids: [],
                            totalQty: 0,
                            contact_info: p.contact_info,
                            joined_at: p.joined_at
                        });
                    }
                    const entry = userMap.get(key)!;
                    entry.ids.push(p.id);
                    entry.totalQty += (p.quantity || 1);
                }

                // 按参与时间排序
                const sortedUsers = Array.from(userMap.entries())
                    .sort((a, b) => new Date(a[1].joined_at).getTime() - new Date(b[1].joined_at).getTime());

                let remainingSlots = availableSlots;
                let totalMigrated = 0;

                for (const [userKey, userData] of sortedUsers) {
                    if (remainingSlots <= 0) break;

                    // 不可拆分：用户的全部名额必须 <= 剩余空位
                    if (userData.totalQty <= remainingSlots) {
                        // 迁移：更新 group_id 为父团
                        const { error: migrateError } = await supabase
                            .from('group_participants')
                            .update({ group_id: groupId })
                            .in('id', userData.ids);

                        if (!migrateError) {
                            remainingSlots -= userData.totalQty;
                            totalMigrated += userData.totalQty;
                        }
                    }
                    // 如果名额超过空位，跳过此用户，检查下一位
                }

                // 更新本团人数
                newCount += totalMigrated;

                // 更新子团人数
                const { data: childGroupData } = await supabase
                    .from('group_buys')
                    .select('current_count')
                    .eq('id', childGroup.id)
                    .single();

                if (childGroupData) {
                    await supabase.from('group_buys').update({
                        current_count: Math.max(0, (childGroupData.current_count || 0) - totalMigrated)
                    }).eq('id', childGroup.id);
                }
            }
        }

        // 更新本团人数和状态
        const newStatus = newCount >= targetCount ? '已锁单' : '进行中';
        await supabase.from('group_buys').update({
            current_count: newCount,
            status: newStatus
        }).eq('id', groupId);

        // Also update the order status to cancelled
        await supabase
            .from('orders')
            .update({ status: '已取消' })
            .eq('item_id', groupId)
            .eq('user_id', user.id)
            .eq('item_type', 'GROUP');

        return NextResponse.json({
            success: true,
            message: group.status === '已锁单' ? '已从锁定的团中取消参与' : undefined
        });
    } catch (error) {
        console.error('Error cancelling participation:', error);
        return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 });
    }
}
