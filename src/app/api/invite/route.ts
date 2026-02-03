import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Generate a random 8-character alphanumeric invite code
 */
function generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * GET /api/invite - Get the current user's invite code (generates one if missing)
 */
export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's current invite code
        const { data: profile, error: fetchError } = await supabase
            .from('users')
            .select('invite_code')
            .eq('id', user.id)
            .single();

        if (fetchError) {
            console.error('Error fetching invite code:', fetchError);
            return NextResponse.json({ error: 'Failed to fetch invite code' }, { status: 500 });
        }

        // If user already has an invite code, return it
        if (profile?.invite_code) {
            return NextResponse.json({ inviteCode: profile.invite_code });
        }

        // Generate a new unique invite code
        const adminClient = createAdminClient();
        let inviteCode = '';
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            inviteCode = generateInviteCode();

            // Check if code already exists
            const { data: existing } = await adminClient
                .from('users')
                .select('id')
                .eq('invite_code', inviteCode)
                .single();

            if (!existing) {
                // Code is unique, save it
                const { error: updateError } = await adminClient
                    .from('users')
                    .update({ invite_code: inviteCode })
                    .eq('id', user.id);

                if (updateError) {
                    console.error('Error saving invite code:', updateError);
                    return NextResponse.json({ error: 'Failed to save invite code' }, { status: 500 });
                }

                return NextResponse.json({ inviteCode });
            }

            attempts++;
        }

        return NextResponse.json({ error: 'Failed to generate unique invite code' }, { status: 500 });

    } catch (error) {
        console.error('Error in invite API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
