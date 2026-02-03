'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AdminSideNav } from './_shared/AdminSideNav';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/auth/login');
                return;
            }

            const { data: profile } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profile?.role !== 'ADMIN') {
                router.push('/');
                return;
            }

            setIsAdmin(true);
        };

        checkAdmin();
    }, [router, supabase]);

    if (isAdmin === null) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
            </div>
        );
    }

    if (!isAdmin) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-gray-50 flex flex-row font-sans overflow-hidden">
            <AdminSideNav />
            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="flex-1 w-full mx-auto px-8 py-8 overflow-y-auto overflow-x-hidden flex flex-col scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                    {children}
                </div>
            </main>
        </div>
    );
}
