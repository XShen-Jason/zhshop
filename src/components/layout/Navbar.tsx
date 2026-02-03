'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, ShoppingBag, Users, Gift, BookOpen, User, Menu, X, LogIn, LogOut, Calendar, Coins, CheckCircle, Sparkles, Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { pointsEvents, messageEvents } from '@/lib/events';
import type { User as SupabaseUser } from '@supabase/supabase-js';

const navItems = [
    { href: '/', label: '首页', icon: Home },
    { href: '/products', label: '商店', icon: ShoppingBag },
    { href: '/groups', label: '拼团', icon: Users },
    { href: '/lottery', label: '抽奖', icon: Gift },
    { href: '/tutorials', label: '教程', icon: BookOpen },
];

interface NavbarProps {
    user?: SupabaseUser | null;
}

export const Navbar: React.FC<NavbarProps> = ({ user: initialUser = null }) => {
    const pathname = usePathname();
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [user, setUser] = useState<SupabaseUser | null>(initialUser);
    const [loading, setLoading] = useState(initialUser === undefined);

    const [points, setPoints] = useState(0);
    const [streak, setStreak] = useState(0);
    const [canCheckIn, setCanCheckIn] = useState(false);
    const [checkingIn, setCheckingIn] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showCheckInResult, setShowCheckInResult] = useState<{
        show: boolean;
        pointsEarned: number;
        isBonus: boolean;
    }>({ show: false, pointsEarned: 0, isBonus: false });

    const fetchingRef = useRef(false);

    const fetchCheckInStatus = useCallback(async () => {
        if (fetchingRef.current) return;
        fetchingRef.current = true;

        try {
            const res = await fetch('/api/checkin');
            if (res.ok) {
                const data = await res.json();
                setPoints(data.points);
                setStreak(data.streak);
                setCanCheckIn(data.canCheckIn);
            }
        } catch (error) {
            console.error('Error fetching check-in status:', error);
        } finally {
            fetchingRef.current = false;
        }
    }, []);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const res = await fetch('/api/messages/unread-count');
            if (res.ok) {
                const data = await res.json();
                setUnreadCount(data.count || 0);
            }
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    }, []);

    useEffect(() => {
        if (initialUser !== undefined) {
            setUser(initialUser);
            setLoading(false);

            if (initialUser) {
                fetchCheckInStatus();
                fetchUnreadCount();
            } else {
                setPoints(0);
                setStreak(0);
                setCanCheckIn(false);
                setUnreadCount(0);
            }
        }
    }, [initialUser, fetchCheckInStatus, fetchUnreadCount]);

    useEffect(() => {
        const supabase = createClient();

        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
            if (session?.user) {
                fetchCheckInStatus();
                fetchUnreadCount();
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user ?? null);
            if (event === 'SIGNED_IN' && session?.user) {
                fetchCheckInStatus();
            } else if (!session?.user) {
                setPoints(0);
                setStreak(0);
                setCanCheckIn(false);
            }
        });

        const unsubscribePoints = pointsEvents.subscribe((newPoints) => {
            setPoints(newPoints);
        });

        return () => {
            subscription.unsubscribe();
            unsubscribePoints();
        };
    }, [fetchCheckInStatus, fetchUnreadCount]);

    // Subscribe to message read events to refresh unread count
    useEffect(() => {
        const unsubscribeMessages = messageEvents.subscribe(() => {
            fetchUnreadCount();
        });
        return () => { unsubscribeMessages(); };
    }, [fetchUnreadCount]);

    // Close menu when route changes
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    // Prevent body scroll when menu is open
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileMenuOpen]);

    const handleCheckIn = async () => {
        if (!canCheckIn || checkingIn) return;

        setCheckingIn(true);
        try {
            const res = await fetch('/api/checkin', { method: 'POST' });
            const data = await res.json();

            if (res.ok && data.success) {
                setPoints(data.newPoints);
                setStreak(data.streak);
                setCanCheckIn(false);
                setShowCheckInResult({
                    show: true,
                    pointsEarned: data.pointsEarned,
                    isBonus: data.isStreakBonus
                });

                pointsEvents.emit(data.newPoints);

                setTimeout(() => {
                    setShowCheckInResult({ show: false, pointsEarned: 0, isBonus: false });
                }, 1500);
            }
        } catch (error) {
            console.error('Error checking in:', error);
        } finally {
            setCheckingIn(false);
        }
    };

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        setMobileMenuOpen(false);
        router.push('/');
        router.refresh();
    };

    return (
        <>
            {/* Check-in Result Toast */}
            {showCheckInResult.show && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] animate-bounce">
                    <div className={`px-6 py-3 rounded-full shadow-xl flex items-center space-x-2 ${showCheckInResult.isBonus ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' : 'bg-green-500 text-white'}`}>
                        {showCheckInResult.isBonus ? <Sparkles size={20} /> : <CheckCircle size={20} />}
                        <span className="font-bold">
                            签到成功！+{showCheckInResult.pointsEarned} 积分
                            {showCheckInResult.isBonus && ' (含连续7天奖励!)'}
                        </span>
                    </div>
                </div>
            )}

            <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 backdrop-blur-lg bg-white/80">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-between h-14 md:h-16">
                        {/* Mobile menu button */}
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="md:hidden p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100 touch-target"
                            aria-label="打开菜单"
                        >
                            <Menu size={24} />
                        </button>

                        {/* Logo */}
                        <Link href="/" className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                                <ShoppingBag size={18} className="text-white" />
                            </div>
                            <span className="font-bold text-lg md:text-xl text-gray-900">智汇商城</span>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-1">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href ||
                                    (item.href !== '/' && pathname.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                            ? 'bg-indigo-50 text-indigo-600'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                            }`}
                                    >
                                        <Icon size={16} className="mr-2" />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Desktop Auth Section */}
                        <div className="hidden md:flex items-center space-x-2">
                            {loading ? (
                                <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse"></div>
                            ) : user ? (
                                <>
                                    <Link
                                        href="/points"
                                        className="flex items-center px-3 py-1.5 bg-amber-50 rounded-full border border-amber-200 hover:bg-amber-100 hover:border-amber-300 transition-all"
                                    >
                                        <Coins size={16} className="text-amber-500 mr-1.5" />
                                        <span className="text-sm font-bold text-amber-700">{points}</span>
                                    </Link>

                                    <button
                                        onClick={handleCheckIn}
                                        disabled={!canCheckIn || checkingIn}
                                        className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${canCheckIn
                                            ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-200'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            }`}
                                        title={canCheckIn ? '点击签到' : `今日已签到 (连续${streak}天)`}
                                    >
                                        <Calendar size={16} className="mr-1.5" />
                                        {checkingIn ? '...' : canCheckIn ? '签到' : '已签'}
                                        {!canCheckIn && streak > 0 && <span className="ml-1 text-xs opacity-80">({streak}天)</span>}
                                    </button>

                                    <Link
                                        href="/messages"
                                        className="relative flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"
                                        title="站内信"
                                    >
                                        <Bell size={18} />
                                        {unreadCount > 0 && (
                                            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                                                {unreadCount > 99 ? '99+' : unreadCount}
                                            </span>
                                        )}
                                    </Link>

                                    <Link
                                        href="/user"
                                        className="flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"
                                    >
                                        <User size={16} className="mr-2" />
                                        我的
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all"
                                    >
                                        <LogOut size={16} />
                                    </button>
                                </>
                            ) : (
                                <Link
                                    href="/auth/login"
                                    className="flex items-center px-5 py-2 rounded-full text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                                >
                                    <LogIn size={16} className="mr-2" />
                                    登录
                                </Link>
                            )}
                        </div>

                        {/* Mobile: User Center button on right */}
                        <div className="md:hidden flex items-center">
                            {!loading && user ? (
                                <Link
                                    href="/user"
                                    className="flex items-center px-2.5 py-1.5 bg-indigo-50 rounded-full border border-indigo-200 hover:bg-indigo-100"
                                >
                                    <User size={16} className="text-indigo-600" />
                                </Link>
                            ) : !loading ? (
                                <Link
                                    href="/auth/login"
                                    className="flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-600 text-white"
                                >
                                    <LogIn size={14} className="mr-1" />
                                    登录
                                </Link>
                            ) : null}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile Slide-Out Menu */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-[100] md:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 menu-backdrop open"
                        onClick={() => setMobileMenuOpen(false)}
                    />

                    {/* Menu Panel */}
                    <div className="absolute top-0 left-0 bottom-0 w-72 bg-white shadow-2xl menu-slide open safe-area-top">
                        {/* Menu Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                                    <ShoppingBag size={16} className="text-white" />
                                </div>
                                <span className="font-bold text-gray-900">智汇商城</span>
                            </div>
                            <button
                                onClick={() => setMobileMenuOpen(false)}
                                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 touch-target"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* User Section (if logged in) */}
                        {user && (
                            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                                <div className="flex items-center justify-between">
                                    <Link
                                        href="/points"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center px-3 py-2 bg-amber-50 rounded-lg border border-amber-200 hover:bg-amber-100"
                                    >
                                        <Coins size={16} className="text-amber-500 mr-1.5" />
                                        <span className="font-medium text-sm text-amber-700">积分</span>
                                    </Link>
                                    <button
                                        onClick={handleCheckIn}
                                        disabled={!canCheckIn || checkingIn}
                                        className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium ${canCheckIn
                                            ? 'bg-green-500 text-white'
                                            : 'bg-gray-200 text-gray-400'
                                            }`}
                                    >
                                        <Calendar size={16} className="mr-1.5" />
                                        {canCheckIn ? '签到' : '签到'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Navigation Links */}
                        <div className="flex-1 overflow-y-auto py-2">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href ||
                                    (item.href !== '/' && pathname.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center px-4 py-3.5 text-base font-medium transition-colors ${isActive
                                            ? 'bg-indigo-50 text-indigo-600 border-r-4 border-indigo-600'
                                            : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                    >
                                        <Icon size={20} className="mr-3" />
                                        {item.label}
                                    </Link>
                                );
                            })}

                            {/* Divider */}
                            <div className="my-2 border-t border-gray-100" />

                            {/* User Actions */}
                            {user ? (
                                <>
                                    <Link
                                        href="/user"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center px-4 py-3.5 text-base font-medium ${pathname === '/user'
                                            ? 'bg-indigo-50 text-indigo-600 border-r-4 border-indigo-600'
                                            : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                    >
                                        <User size={20} className="mr-3" />
                                        个人中心
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center w-full px-4 py-3.5 text-base font-medium text-red-600 hover:bg-red-50"
                                    >
                                        <LogOut size={20} className="mr-3" />
                                        退出登录
                                    </button>
                                </>
                            ) : (
                                <Link
                                    href="/auth/login"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center px-4 py-3.5 text-base font-medium text-indigo-600"
                                >
                                    <LogIn size={20} className="mr-3" />
                                    登录 / 注册
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

