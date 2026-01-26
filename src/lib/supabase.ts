import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface DbProduct {
    id: string;
    title: string;
    description: string;
    price: number;
    category: string;
    in_stock: boolean;
    features: string[];
    specs: string | null;
    tutorial_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface DbTutorial {
    id: string;
    title: string;
    summary: string;
    content: string;
    category: string;
    tags: string[];
    related_product_id: string | null;
    is_locked: boolean;
    created_at: string;
    updated_at: string;
}

export interface DbGroupBuy {
    id: string;
    title: string;
    target_count: number;
    current_count: number;
    status: string;
    price: number;
    description: string;
    features: string[];
    created_at: string;
    updated_at: string;
}

export interface DbLottery {
    id: string;
    title: string;
    draw_date: string;
    winners_count: number;
    entry_cost: number;
    status: string;
    participants_count: number;
    description: string;
    prizes: string[];
    created_at: string;
    updated_at: string;
}

export interface DbOrder {
    id: string;
    user_id: string;
    item_id: string;
    item_type: 'PRODUCT' | 'GROUP' | 'LOTTERY';
    item_name: string;
    status: string;
    contact_details: string;
    notes: string | null;
    cost: number | null;
    currency: 'USD' | 'POINTS' | null;
    created_at: string;
    updated_at: string;
}

export interface DbUser {
    id: string;
    name: string;
    email: string;
    role: 'USER' | 'ADMIN';
    points: number;
    contact_info: string | null;
    last_check_in: string | null;
    created_at: string;
    updated_at: string;
}
