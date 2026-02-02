import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const body = await req.json();
        const { contacts } = body; // Expects array of contact objects

        if (!Array.isArray(contacts)) {
            return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
        }

        const { error } = await supabase
            .from('users')
            .update({ saved_contacts: contacts })
            .eq('id', user.id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating contacts:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
