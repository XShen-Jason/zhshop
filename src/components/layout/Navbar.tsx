'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, ShoppingBag, Users, Gift, BookOpen, User, Menu, X, LogIn, LogOut, Calendar, Coins, CheckCircle, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { pointsEvents } from '@/lib/events';
import type { User as SupabaseUser } from '@supabase/supabase-js';

const navItems = [
    { href: '/', label: '首页', icon: Home },
    { href: '/products', label: '商店', icon: ShoppingBag },
    { href: '/groups', label: '拼车', icon: Users },
    { href: '/lottery', label: '抽奖', icon: Gift },
    { href: '/tutorials', label: '教程', icon: BookOpen },
];

export const Navbar: React.FC = () => {
    const pathname = usePathname();
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [points, setPoints] = useState(0);
    const [streak, setStreak] = useState(0);
    const [canCheckIn, setCanCheckIn] = useState(false);
    const [checkingIn, setCheckingIn] = useState(false);
    const [showCheckInResult, setShowCheckInResult] = useState<{
        show: boolean;
        pointsEarned: number;
        isBonus: boolean;
    }>({ show: false, pointsEarned: 0, isBonus: false });

    // Prevent duplicate fetches (React StrictMode, fast re-renders)
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

    useEffect(() => {
        const supabase = createClient();

        // Get initial user
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
            setLoading(false);
            if (user) {
                fetchCheckInStatus();
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user ?? null);
            // Only fetch check-in status on explicit SIGNED_IN event, not during INITIAL_SESSION
            // This prevents "Failed to fetch" errors during auth recovery/refresh
            if (event === 'SIGNED_IN' && session?.user) {
                fetchCheckInStatus();
            } else if (!session?.user) {
                setPoints(0);
                setStreak(0);
                setCanCheckIn(false);
            }
        });

        // Listen for points updates from other components
        const unsubscribePoints = pointsEvents.subscribe((newPoints) => {
            setPoints(newPoints);
        });

        return () => {
            subscription.unsubscribe();
            unsubscribePoints();
        };
    }, [fetchCheckInStatus]);

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

                // Emit points update to other components
                pointsEvents.emit(data.newPoints);

                // Hide result after 1.5 seconds (faster)
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
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link href="/" className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                                <ShoppingBag size={18} className="text-white" />
                            </div>
                            <span className="font-bold text-xl text-gray-900">数字商店</span>
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

                        {/* Auth Section */}
                        <div className="hidden md:flex items-center space-x-2">
                            {loading ? (
                                <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse"></div>
                            ) : user ? (
                                <>
                                    {/* Points Display - Clickable */}
                                    <Link
                                        href="/points"
                                        className="flex items-center px-3 py-1.5 bg-amber-50 rounded-full border border-amber-200 hover:bg-amber-100 hover:border-amber-300 transition-all"
                                    >
                                        <Coins size={16} className="text-amber-500 mr-1.5" />
                                        <span className="text-sm font-bold text-amber-700">{points}</span>
                                    </Link>

                                    {/* Check-in Button */}
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

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                        >
                            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>

                    {/* Mobile Navigation */}
                    {mobileMenuOpen && (
                        <div className="md:hidden py-4 border-t border-gray-100">
                            {user && (
                                <div className="flex items-center justify-between px-4 py-3 mb-2 bg-gray-50 rounded-lg mx-2">
                                    <Link
                                        href="/points"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center hover:opacity-70 transition"
                                    >
                                        <Coins size={18} className="text-amber-500 mr-2" />
                                        <span className="font-bold text-amber-700">{points} 积分</span>
                                    </Link>
                                    <button
                                        onClick={handleCheckIn}
                                        disabled={!canCheckIn || checkingIn}
                                        className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${canCheckIn
                                            ? 'bg-green-500 text-white'
                                            : 'bg-gray-200 text-gray-400'
                                            }`}
                                    >
                                        <Calendar size={14} className="mr-1" />
                                        {canCheckIn ? '签到' : '已签'}
                                        {!canCheckIn && streak > 0 && <span className="ml-1 text-xs">({streak}天)</span>}
                                    </button>
                                </div>
                            )}

                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center px-4 py-3 text-sm font-medium ${isActive
                                            ? 'bg-indigo-50 text-indigo-600'
                                            : 'text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        <Icon size={18} className="mr-3" />
                                        {item.label}
                                    </Link>
                                );
                            })}
                            <div className="border-t border-gray-100 mt-2 pt-2">
                                {user ? (
                                    <>
                                        <Link
                                            href="/user"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="flex items-center px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
                                        >
                                            <User size={18} className="mr-3" />
                                            用户中心
                                        </Link>
                                        <button
                                            onClick={() => {
                                                handleLogout();
                                                setMobileMenuOpen(false);
                                            }}
                                            className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
                                        >
                                            <LogOut size={18} className="mr-3" />
                                            退出登录
                                        </button>
                                    </>
                                ) : (
                                    <Link
                                        href="/auth/login"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center px-4 py-3 text-sm font-medium text-indigo-600"
                                    >
                                        <LogIn size={18} className="mr-3" />
                                        登录 / 注册
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </nav>
        </>
    );
};
