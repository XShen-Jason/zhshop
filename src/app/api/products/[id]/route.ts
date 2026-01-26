import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (!data) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        const product = {
            id: data.id,
            title: data.title,
            description: data.description,
            price: data.price,
            category: data.category,
            inStock: data.in_stock,
            stock: data.stock ?? 0,
            features: data.features || [],
            specs: data.specs,
            tutorialId: data.tutorial_id
        };

        return NextResponse.json(product);
    } catch (error) {
        console.error('Error fetching product:', error);
        return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
    }
}
