import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PUT - Update contact info for a lottery entry
export async function PUT(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { lotteryId, contactInfo } = body;

        if (!lotteryId || !contactInfo) {
            return NextResponse.json({ error: 'Missing lotteryId or contactInfo' }, { status: 400 });
        }

        // Update all user entries for this lottery
        const { error } = await supabase
            .from('lottery_entries')
            .update({ contact_info: contactInfo })
            .eq('lottery_id', lotteryId)
            .eq('user_id', user.id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating lottery contact:', error);
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}
