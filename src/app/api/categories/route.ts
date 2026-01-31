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
        const { oldName, newName, type, scope, parentCategory } = body;

        if (!oldName || !newName || !type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const table = type === 'tutorials' ? 'tutorials' : 'products';

        let query = supabase.from(table).update(
            scope === 'subCategory'
                ? { sub_category: newName }
                : { category: newName }
        );

        if (scope === 'subCategory') {
            query = query.eq('sub_category', oldName);
            // If parentCategory is provided, scope it further to avoid renaming same-named subs in different parents (though typically unique-ish)
            if (parentCategory) {
                query = query.eq('category', parentCategory);
            }
        } else {
            query = query.eq('category', oldName);
        }

        const { error } = await query;

        if (error) throw error;

        return NextResponse.json({ success: true, message: `Updated ${type} ${scope || 'category'} from '${oldName}' to '${newName}'` });
    } catch (error) {
        console.error('Error updating category:', error);
        return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
    }
}
