'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    ShoppingCart,
    Box,
    Users,
    Gift,
    FileText,
    Bell,
    Settings,
    BookOpen,
    MessageSquare,
    LogOut
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/GlobalToast';

const navItems = [
    { label: '总览', href: '/admin', icon: LayoutDashboard, exact: true },
    { label: '订单', href: '/admin/orders', icon: ShoppingCart },
    { label: '商品', href: '/admin/products', icon: Box },
    { label: '拼团', href: '/admin/groups', icon: Users },
    { label: '抽奖', href: '/admin/lotteries', icon: Gift },
    { label: '教程', href: '/admin/tutorials', icon: BookOpen },
    { label: '站内信', href: '/admin/messages', icon: MessageSquare },
    { label: '设置', href: '/admin/settings', icon: Settings },
];

export function AdminSideNav() {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const { showToast } = useToast();

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            showToast('已退出登录', 'success');
            router.push('/auth/login');
        } catch (error) {
            console.error('Logout error:', error);
            showToast('退出登录失败', 'error');
        }
    };

    return (
        <aside className="w-64 bg-white border-r border-gray-100 flex-shrink-0 flex flex-col h-screen sticky top-0 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-30 font-sans">
            <div className="p-6 border-b border-gray-50/50">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-200 group-hover:shadow-indigo-300 transition-all duration-300">
                        Z
                    </div>
                    <span className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700">Zhshop Admin</span>
                </Link>
            </div>

            <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 scrollbar-thin scrollbar-thumb-gray-100">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">Menu</div>
                {navItems.map(item => {
                    const Icon = item.icon;
                    const isActive = item.exact
                        ? pathname === item.href
                        : pathname.startsWith(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden ${isActive
                                ? 'text-indigo-600 bg-indigo-50/80 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                        >
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full" />
                            )}
                            <Icon size={18} className={`transition-colors duration-200 ${isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                            <span className="relative z-10">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-50 bg-gray-50/30">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 group"
                >
                    <LogOut size={18} className="text-gray-400 group-hover:text-red-500 transition-colors" />
                    <span>退出登录</span>
                </button>
            </div>
        </aside>
    );
}
