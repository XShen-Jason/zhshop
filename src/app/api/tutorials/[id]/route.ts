import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const { data, error } = await supabase
            .from('tutorials')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (!data) {
            return NextResponse.json({ error: 'Tutorial not found' }, { status: 404 });
        }

        const tutorial = {
            id: data.id,
            title: data.title,
            summary: data.summary,
            content: data.content,
            updatedAt: data.updated_at,
            category: data.category,
            tags: data.tags || [],
            relatedProductId: data.related_product_id,
            isLocked: data.is_locked,
            imageUrl: data.image_url,
            format: (data.tags || []).includes('html-mode') ? 'html' : 'md'
        };

        return NextResponse.json(tutorial);
    } catch (error) {
        console.error('Error fetching tutorial:', error);
        return NextResponse.json({ error: 'Failed to fetch tutorial' }, { status: 500 });
    }
}
