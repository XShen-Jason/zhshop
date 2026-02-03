import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Cleanup Unverified Users API
 * 
 * Deletes users who:
 * - Registered more than 24 hours ago
 * - Have NOT verified their email (email_confirmed_at IS NULL)
 * 
 * This endpoint should be called by a cron job (e.g., system crontab).
 * Protected by CRON_SECRET environment variable.
 * 
 * Usage:
 *   curl -X POST http://localhost:3000/api/cron/cleanup-unverified \
 *        -H "Authorization: Bearer YOUR_CRON_SECRET"
 */
export async function POST(request: Request) {
    try {
        // Security: Verify cron secret
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        // If CRON_SECRET is set, enforce it
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            console.warn('[Cleanup] Unauthorized access attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminClient = createAdminClient();

        // Calculate cutoff time (24 hours ago)
        const cutoffDate = new Date();
        cutoffDate.setHours(cutoffDate.getHours() - 24);
        const cutoffISO = cutoffDate.toISOString();

        console.log(`[Cleanup] Starting cleanup. Cutoff: ${cutoffISO}`);

        // Find unverified users older than 24 hours
        // Query auth.users directly via SQL for precise control
        const { data: unverifiedUsers, error: queryError } = await adminClient
            .from('users')
            .select('id, email, created_at')
            .is('email_confirmed_at', null)
            .lt('created_at', cutoffISO);

        // Note: The above query targets the public.users mirror table.
        // For auth.users, we need to use raw SQL or auth.admin.listUsers.
        // Let's use auth.admin.listUsers instead for accuracy.

        // Fetch all users via auth admin API
        const { data: authData, error: listError } = await adminClient.auth.admin.listUsers({
            perPage: 1000 // Adjust if you have more users
        });

        if (listError) {
            console.error('[Cleanup] Error listing users:', listError);
            return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
        }

        const users = authData?.users || [];

        // Filter: email NOT confirmed AND created more than 24 hours ago
        const usersToDelete = users.filter(user => {
            // Check if email is NOT confirmed
            const isUnverified = !user.email_confirmed_at;

            // Check if created more than 24 hours ago
            const createdAt = new Date(user.created_at);
            const isOldEnough = createdAt < cutoffDate;

            return isUnverified && isOldEnough;
        });

        console.log(`[Cleanup] Found ${usersToDelete.length} unverified users to delete.`);

        if (usersToDelete.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No unverified users to clean up',
                deletedCount: 0,
                details: []
            });
        }

        // Delete each user
        const results: { email: string; success: boolean; error?: string }[] = [];

        for (const user of usersToDelete) {
            try {
                const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

                if (deleteError) {
                    console.error(`[Cleanup] Failed to delete ${user.email}:`, deleteError);
                    results.push({ email: user.email || 'unknown', success: false, error: deleteError.message });
                } else {
                    console.log(`[Cleanup] Deleted: ${user.email} (created: ${user.created_at})`);
                    results.push({ email: user.email || 'unknown', success: true });
                }
            } catch (err: any) {
                console.error(`[Cleanup] Exception deleting ${user.email}:`, err);
                results.push({ email: user.email || 'unknown', success: false, error: err.message });
            }
        }

        const deletedCount = results.filter(r => r.success).length;
        const failedCount = results.filter(r => !r.success).length;

        console.log(`[Cleanup] Completed. Deleted: ${deletedCount}, Failed: ${failedCount}`);

        return NextResponse.json({
            success: true,
            message: `Cleanup completed`,
            deletedCount,
            failedCount,
            details: results
        });

    } catch (error: any) {
        console.error('[Cleanup] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}

// Allow GET for easy manual testing (with same security check)
export async function GET(request: Request) {
    return POST(request);
}
