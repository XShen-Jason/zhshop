import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(request: Request) {
    try {
        const supabase = await createClient();

        // Auth check
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Admin check
        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (profile?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await request.json();
        const { oldName, newName, type } = body;

        if (!oldName || !newName || !type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const table = type === 'tutorials' ? 'tutorials' : 'products';

        // Update all records with the old category name to the new one
        const { error } = await supabase
            .from(table)
            .update({ category: newName })
            .eq('category', oldName);

        if (error) throw error;

        return NextResponse.json({ success: true, message: `Updated ${type} category from '${oldName}' to '${newName}'` });
    } catch (error) {
        console.error('Error updating category:', error);
        return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
    }
}
