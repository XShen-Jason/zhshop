import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client with SERVICE_ROLE key for admin operations.
 * This bypasses RLS policies and should ONLY be used for:
 * - Auto-draw lottery (system cron job)
 * - Admin batch operations that require elevated privileges
 * 
 * NEVER expose this client to the frontend or user-facing code!
 */
export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error(
            'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
            'Auto-draw requires service role key to bypass RLS policies.'
        );
    }

    return createSupabaseClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}
