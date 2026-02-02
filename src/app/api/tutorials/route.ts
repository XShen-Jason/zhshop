import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const limit = url.searchParams.get('limit');

        const supabase = await createClient();
        let query = supabase
            .from('tutorials')
            .select('*')
            .order('updated_at', { ascending: false });

        if (limit) {
            query = query.limit(parseInt(limit, 10));
        }

        const { data, error } = await query;

        if (error) throw error;

        const tutorials = (data || []).map(t => ({
            id: t.id,
            title: t.title,
            summary: t.summary,
            content: t.content,
            updatedAt: t.updated_at,
            category: t.category,
            tags: t.tags || [],
            relatedProductId: t.related_product_id,
            isLocked: t.is_locked
        }));

        return NextResponse.json(tutorials);
    } catch (error) {
        console.error('Error fetching tutorials:', error);
        return NextResponse.json({ error: 'Failed to fetch tutorials' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // Auth check
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Admin check
        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (profile?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await request.json();

        const { error } = await supabase.from('tutorials').insert({
            title: body.title,
            summary: body.summary,
            content: body.content,
            category: body.category,
            tags: body.tags || [],
            related_product_id: body.relatedProductId || null,
            is_locked: body.isLocked || false,
            updated_at: new Date().toISOString()
        });

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error creating tutorial:', error);
        return NextResponse.json({ error: 'Failed to create tutorial' }, { status: 500 });
    }
}

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
        const { id, ...updates } = body;

        const updateData: any = { updated_at: new Date().toISOString() };
        if (updates.title) updateData.title = updates.title;
        if (updates.summary) updateData.summary = updates.summary;
        if (updates.content) updateData.content = updates.content;
        if (updates.category) updateData.category = updates.category;
        if (updates.tags) updateData.tags = updates.tags;
        if (updates.relatedProductId !== undefined) updateData.related_product_id = updates.relatedProductId;
        if (updates.isLocked !== undefined) updateData.is_locked = updates.isLocked;

        const { error } = await supabase
            .from('tutorials')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating tutorial:', error);
        return NextResponse.json({ error: 'Failed to update tutorial' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient();

        // Auth check
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Admin check
        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (profile?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await request.json();

        const { error } = await supabase
            .from('tutorials')
            .delete()
            .eq('id', body.id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting tutorial:', error);
        return NextResponse.json({ error: 'Failed to delete tutorial' }, { status: 500 });
    }
}
