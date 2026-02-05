'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AdminSideNav } from './_shared/AdminSideNav';

import { Menu } from 'lucide-react';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
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
        <div className="fixed inset-0 bg-gray-50 flex flex-col lg:flex-row font-sans overflow-hidden">
            {/* Mobile Header */}
            <div className="lg:hidden flex-none h-16 bg-white border-b border-gray-200 flex items-center px-4 justify-between z-20">
                <div className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700">
                    Zhshop Admin
                </div>
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <Menu size={24} />
                </button>
            </div>

            <AdminSideNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
                <div className="flex-1 w-full mx-auto px-4 lg:px-8 py-4 lg:py-8 overflow-y-auto overflow-x-hidden flex flex-col scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                    {children}
                </div>
            </main>
        </div>
    );
}
