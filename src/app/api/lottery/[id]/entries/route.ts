import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/lottery/[id]/entries - Get all entries for a lottery (admin only)
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const adminSupabase = createAdminClient();

        // Auth & Admin check
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (profile?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        // Get all entries with user info (using admin client to bypass RLS)
        const { data: entries, error } = await adminSupabase
            .from('lottery_entries')
            .select('id, user_id, is_winner, contact_info, entered_at, users(email, name, saved_contacts)')
            .eq('lottery_id', id)
            .order('entered_at', { ascending: false });

        if (error) throw error;

        // Map to frontend format
        const result = (entries || []).map((entry: any) => ({
            id: entry.id,
            userId: entry.user_id,
            isWinner: entry.is_winner,
            contactInfo: entry.contact_info,
            createdAt: entry.entered_at,
            users: {
                ...entry.users,
                savedContacts: entry.users?.saved_contacts
            },
            savedContacts: entry.users?.saved_contacts
        }));

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching lottery entries:', error);
        return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
    }
}
