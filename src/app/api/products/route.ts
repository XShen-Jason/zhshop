import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const limit = url.searchParams.get('limit');

        const supabase = await createClient();
        // Fetch all products - we'll sort in JS for consistency with groups
        const { data, error } = await supabase
            .from('products')
            .select('*');

        if (error) throw error;

        // Transform snake_case to camelCase for frontend
        let products = (data || []).map(p => ({
            id: p.id,
            title: p.title,
            description: p.description,
            price: p.price,
            category: p.category,
            subCategory: p.sub_category,
            inStock: p.in_stock,
            stock: p.stock || 0,
            features: p.features || [],
            specs: p.specs,
            tutorialId: p.tutorial_id,
            isHot: p.is_hot || false,
            updatedAt: p.updated_at || p.created_at
        }));

        // Sort: isHot first, then by updatedAt DESC (same logic as groups)
        products.sort((a, b) => {
            // 1. isHot: Hot items first
            if (a.isHot !== b.isHot) {
                return a.isHot ? -1 : 1;
            }
            // 2. Updated At: Recent to Old
            const timeA = new Date(a.updatedAt).getTime();
            const timeB = new Date(b.updatedAt).getTime();
            return timeB - timeA;
        });

        // Apply limit after sorting
        if (limit) {
            products = products.slice(0, parseInt(limit, 10));
        }

        return NextResponse.json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
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

        // Transform camelCase to snake_case
        const { error } = await supabase.from('products').insert({
            title: body.title,
            description: body.description,
            price: body.price,
            category: body.category,
            sub_category: body.subCategory,
            in_stock: body.inStock ?? true,
            stock: body.stock ?? 0,
            features: body.features || [],
            specs: body.specs,
            tutorial_id: body.tutorialId,
            is_hot: body.isHot ?? false
        });

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error creating product:', error);
        return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
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

        const updateData: any = {};
        if (body.title) updateData.title = body.title;
        if (body.description) updateData.description = body.description;
        if (body.price !== undefined) updateData.price = body.price;
        if (body.category) updateData.category = body.category;
        if (body.subCategory !== undefined) updateData.sub_category = body.subCategory;
        if (body.inStock !== undefined) updateData.in_stock = body.inStock;
        if (body.stock !== undefined) updateData.stock = body.stock;
        if (body.features) updateData.features = body.features;
        if (body.specs) updateData.specs = body.specs;
        if (body.tutorialId !== undefined) updateData.tutorial_id = body.tutorialId;
        if (body.isHot !== undefined) updateData.is_hot = body.isHot;

        const { error } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', body.id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating product:', error);
        return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
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
            .from('products')
            .delete()
            .eq('id', body.id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting product:', error);
        return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }
}
