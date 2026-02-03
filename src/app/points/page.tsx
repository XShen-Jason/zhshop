'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Coins, ArrowRight, TrendingUp, TrendingDown, Calendar, Gift, CheckCircle } from 'lucide-react';

interface PointLog {
    id: string;
    amount: number;
    reason: string;
    type: 'EARN' | 'SPEND';
    createdAt: string;
}

export default function PointsPage() {
    const router = useRouter();
    const [points, setPoints] = useState(0);
    const [logs, setLogs] = useState<PointLog[]>([]);
    const [loading, setLoading] = useState(true);

    // Prevent duplicate fetches (React StrictMode, fast re-renders)
    const fetchingRef = useRef(false);

    const fetchData = useCallback(async () => {
        if (fetchingRef.current) return;
        fetchingRef.current = true;

        try {
            const res = await fetch('/api/points');
            if (res.status === 401) {
                router.push('/auth/login');
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setPoints(data.points);
                setLogs(data.logs);
            }
        } catch (error) {
            console.error('Error fetching points:', error);
        } finally {
            setLoading(false);
            fetchingRef.current = false;
        }
    }, [router]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const earnedTotal = logs.filter(l => l.type === 'EARN').reduce((sum, l) => sum + l.amount, 0);
    const spentTotal = logs.filter(l => l.type === 'SPEND').reduce((sum, l) => sum + l.amount, 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6">
            <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-900 mb-4 md:mb-6 flex items-center transition-colors">
                <ArrowRight className="rotate-180 mr-2" size={16} /> 返回
            </button>

            {/* Points Summary */}
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl md:rounded-3xl p-5 md:p-8 mb-6 md:mb-8 text-white shadow-xl">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-amber-100 text-xs md:text-sm font-bold uppercase tracking-wider mb-1 md:mb-2">当前积分</p>
                        <p className="text-3xl md:text-5xl font-extrabold flex items-center">
                            <Coins size={28} className="mr-2 md:mr-3 md:w-10 md:h-10" />
                            {points}
                        </p>
                    </div>
                    <Link
                        href="/lottery"
                        className="bg-white/20 hover:bg-white/30 px-4 md:px-6 py-2 md:py-3 rounded-xl font-bold transition flex items-center text-sm md:text-base"
                    >
                        <Gift size={16} className="mr-1.5 md:mr-2 md:w-[18px] md:h-[18px]" />
                        抽奖
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
                <div className="bg-green-50 p-4 md:p-6 rounded-xl md:rounded-2xl border border-green-100">
                    <div className="flex items-center mb-1 md:mb-2">
                        <TrendingUp size={16} className="text-green-500 mr-1.5 md:mr-2 md:w-5 md:h-5" />
                        <span className="text-xs md:text-sm text-green-700 font-bold">累计获得</span>
                    </div>
                    <p className="text-xl md:text-3xl font-extrabold text-green-600">+{earnedTotal}</p>
                </div>
                <div className="bg-red-50 p-4 md:p-6 rounded-xl md:rounded-2xl border border-red-100">
                    <div className="flex items-center mb-1 md:mb-2">
                        <TrendingDown size={16} className="text-red-500 mr-1.5 md:mr-2 md:w-5 md:h-5" />
                        <span className="text-xs md:text-sm text-red-700 font-bold">累计消耗</span>
                    </div>
                    <p className="text-xl md:text-3xl font-extrabold text-red-600">-{spentTotal}</p>
                </div>
            </div>

            {/* Point History */}
            <div className="bg-white rounded-2xl md:rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-4 md:px-8 py-4 md:py-6 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-bold text-lg md:text-xl text-gray-800">积分明细</h3>
                </div>

                {logs.length === 0 ? (
                    <div className="p-10 md:p-16 text-center text-gray-400 flex flex-col items-center">
                        <Coins size={36} className="mb-4 opacity-20 md:w-12 md:h-12" />
                        <p>暂无积分记录</p>
                        <p className="text-sm mt-2">签到或参与活动即可获得积分</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {logs.map(log => (
                            <div key={log.id} className="p-4 md:p-6 hover:bg-gray-50/80 transition flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center mr-3 md:mr-4 ${log.type === 'EARN'
                                        ? 'bg-green-100 text-green-600'
                                        : 'bg-red-100 text-red-600'
                                        }`}>
                                        {log.type === 'EARN' ? <TrendingUp size={16} className="md:w-5 md:h-5" /> : <TrendingDown size={16} className="md:w-5 md:h-5" />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 text-sm md:text-base">{log.reason}</p>
                                        <p className="text-xs md:text-sm text-gray-500 flex items-center mt-0.5 md:mt-1">
                                            <Calendar size={12} className="mr-1 md:w-[14px] md:h-[14px]" />
                                            {new Date(log.createdAt).toLocaleString('zh-CN', {
                                                month: '2-digit',
                                                day: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <div className={`text-lg md:text-xl font-bold ${log.type === 'EARN' ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {log.type === 'EARN' ? '+' : '-'}{log.amount}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Tips */}
            <div className="mt-6 md:mt-8 bg-amber-50 rounded-xl md:rounded-2xl p-4 md:p-6 border border-amber-100">
                <h4 className="font-bold text-amber-800 mb-2 md:mb-3 flex items-center text-sm md:text-base">
                    <CheckCircle size={16} className="mr-2 md:w-[18px] md:h-[18px]" />
                    获取积分的方式
                </h4>
                <ul className="space-y-1.5 md:space-y-2 text-amber-700 text-xs md:text-sm">
                    <li>• 首次注册 +200 积分</li>
                    <li>• 每日签到 +10 积分（连续 1-7 天）</li>
                    <li>• 每日签到 +20 积分（连续 7-30 天）</li>
                    <li>• 每日签到 +30 积分（连续 30 天以上）</li>
                    <li>• 购买商品返还积分</li>
                </ul>
            </div>
        </div>
    );
}
