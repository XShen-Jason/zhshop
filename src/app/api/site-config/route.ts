import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: Public - fetch site config
export async function GET() {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('site_config')
            .select('key, value');

        if (error) throw error;

        // Convert to object
        const config: Record<string, string> = {};
        for (const row of data || []) {
            config[row.key] = row.value || '';
        }

        return NextResponse.json(config);
    } catch (error) {
        console.error('Error fetching site config:', error);
        return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
    }
}

// PUT: Admin only - update site config
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

        // Update each key-value pair
        for (const [key, value] of Object.entries(body)) {
            await supabase
                .from('site_config')
                .upsert({ key, value: value as string, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating site config:', error);
        return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
    }
}
