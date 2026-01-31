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
        <div className="max-w-4xl mx-auto p-6">
            <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-900 mb-6 flex items-center transition-colors">
                <ArrowRight className="rotate-180 mr-2" size={16} /> 返回
            </button>

            {/* Points Summary */}
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-3xl p-8 mb-8 text-white shadow-xl">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-amber-100 text-sm font-bold uppercase tracking-wider mb-2">当前积分</p>
                        <p className="text-5xl font-extrabold flex items-center">
                            <Coins size={40} className="mr-3" />
                            {points}
                        </p>
                    </div>
                    <Link
                        href="/lottery"
                        className="bg-white/20 hover:bg-white/30 px-6 py-3 rounded-xl font-bold transition flex items-center"
                    >
                        <Gift size={18} className="mr-2" />
                        去抽奖
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                    <div className="flex items-center mb-2">
                        <TrendingUp size={20} className="text-green-500 mr-2" />
                        <span className="text-sm text-green-700 font-bold">累计获得</span>
                    </div>
                    <p className="text-3xl font-extrabold text-green-600">+{earnedTotal}</p>
                </div>
                <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                    <div className="flex items-center mb-2">
                        <TrendingDown size={20} className="text-red-500 mr-2" />
                        <span className="text-sm text-red-700 font-bold">累计消耗</span>
                    </div>
                    <p className="text-3xl font-extrabold text-red-600">-{spentTotal}</p>
                </div>
            </div>

            {/* Point History */}
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-bold text-xl text-gray-800">积分明细</h3>
                </div>

                {logs.length === 0 ? (
                    <div className="p-16 text-center text-gray-400 flex flex-col items-center">
                        <Coins size={48} className="mb-4 opacity-20" />
                        <p>暂无积分记录</p>
                        <p className="text-sm mt-2">签到或参与活动即可获得积分</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {logs.map(log => (
                            <div key={log.id} className="p-6 hover:bg-gray-50/80 transition flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${log.type === 'EARN'
                                        ? 'bg-green-100 text-green-600'
                                        : 'bg-red-100 text-red-600'
                                        }`}>
                                        {log.type === 'EARN' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{log.reason}</p>
                                        <p className="text-sm text-gray-500 flex items-center mt-1">
                                            <Calendar size={14} className="mr-1" />
                                            {new Date(log.createdAt).toLocaleString('zh-CN', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <div className={`text-xl font-bold ${log.type === 'EARN' ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {log.type === 'EARN' ? '+' : '-'}{log.amount}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Tips */}
            <div className="mt-8 bg-amber-50 rounded-2xl p-6 border border-amber-100">
                <h4 className="font-bold text-amber-800 mb-3 flex items-center">
                    <CheckCircle size={18} className="mr-2" />
                    获取积分的方式
                </h4>
                <ul className="space-y-2 text-amber-700 text-sm">
                    <li>• 每日签到基础 +10 积分（连续 1-7 天）</li>
                    <li>• 连续签到 8-30 天，每日 +20 积分</li>
                    <li>• 连续签到 30 天以上，每日 +30 积分</li>
                    <li>• 首次注册 +100 积分</li>
                    <li>• 断签后重新从基础积分计算</li>
                </ul>
            </div>
        </div>
    );
}
