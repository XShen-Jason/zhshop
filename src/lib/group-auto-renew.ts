
// import { SupabaseClient } from '@/lib/supabase/server'; // Removed invalid import

export async function checkAndTriggerAutoRenew(adminClient: any, targetGroupId: string) {
    try {
        console.log(`AutoRenew: Triggered for GroupID: ${targetGroupId}`);

        // 1. Get the target group full details
        const { data: fullGroup, error } = await adminClient
            .from('group_buys')
            .select('*')
            .eq('id', targetGroupId)
            .single();

        if (error || !fullGroup) {
            console.error('AutoRenew: Group not found', targetGroupId);
            return { success: false, reason: 'Group not found' };
        }

        console.log(`AutoRenew: Target Group: "${fullGroup.title}" Status: ${fullGroup.status} Count: ${fullGroup.current_count}/${fullGroup.target_count} AutoRenew: ${fullGroup.auto_renew}`);

        // 2. Validate status
        // Allow if Locked OR if Active but Full (current >= target)
        if (fullGroup.status !== '已锁单' && fullGroup.current_count < fullGroup.target_count) {
            console.log('AutoRenew: Blocked - Group is not locked and not full');
            return { success: false, reason: 'Group is not locked and not full' };
        }

        if (!fullGroup.auto_renew) {
            console.log('AutoRenew: Blocked - Auto renew is disabled');
            return { success: false, reason: 'Auto renew is disabled' };
        }

        // 3. Get Base Title
        const baseTitle = fullGroup.title.replace(/\s*#\s*\d+\s*$/, '');
        console.log(`AutoRenew: Base Title extracted: "${baseTitle}"`);

        // 4. Check for Blocking Groups (Active/Unfilled groups in the same series)
        const { data: unfilledGroups } = await adminClient
            .from('group_buys')
            .select('id, title, current_count, target_count, status')
            .ilike('title', `${baseTitle}%`)
            .neq('status', '已结束');

        console.log(`AutoRenew: Potential siblings found: ${(unfilledGroups || []).length}`);

        // Manual filter to strictly exclude self AND ensure exact base title match
        // strict base title match prevents "Node" from matching "Node-Pro"
        const others = (unfilledGroups || []).filter((g: any) => {
            if (g.id === targetGroupId) return false;

            // Check if this group belongs to the exact same series
            const otherBase = g.title.replace(/\s*#\s*\d+\s*$/, '');
            return otherBase === baseTitle;
        });

        const activeSibling = others.find((g: any) => {
            // A sibling blocks if it is NOT full (i.e. has space)
            const isUnfilled = g.current_count < g.target_count;
            if (isUnfilled) {
                console.log(`AutoRenew: Blocking sibling found: ${g.id} (${g.title}) Count: ${g.current_count}/${g.target_count}`);
            }
            return isUnfilled;
        });

        if (activeSibling) {
            return {
                success: false,
                reason: `Active sibling group exists: ${activeSibling.title}`,
                sibling: activeSibling
            };
        }

        // 5. Calculate Batch Number (Max + 1)
        const { data: allTitles } = await adminClient
            .from('group_buys')
            .select('title')
            .ilike('title', `${baseTitle}%`);

        let maxNum = 0;
        const numRegex = /\s*#\s*(\d+)\s*$/;

        (allTitles || []).forEach((g: any) => {
            const match = g.title.match(numRegex);
            if (match) {
                const num = parseInt(match[1], 10);
                if (!isNaN(num) && num > maxNum) maxNum = num;
            }
        });

        console.log(`AutoRenew: Max Num: ${maxNum}`);

        const batchNumber = maxNum > 0 ? maxNum + 1 : 2;
        const newTitle = `${baseTitle} #${batchNumber}`;
        console.log(`AutoRenew: New Title Proposed: "${newTitle}"`);

        // 6. Create New Group
        const { data: newGroup, error: createError } = await adminClient
            .from('group_buys')
            .insert({
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
            })
            .select()
            .single();

        if (createError) {
            console.error('AutoRenew: Failed to create group', createError);
            throw createError;
        }

        console.log(`AutoRenew: Success! Created ${newGroup.id} (${newGroup.title})`);
        return { success: true, newGroup };

    } catch (error) {
        console.error('AutoRenew: Internal Error', error);
        return { success: false, reason: 'Internal error' };
    }
}
