'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Gift, Clock, Users, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Lottery } from '@/types';
import { formatBeijing } from '@/lib/timezone';
import { useRealtimeSubscription } from '@/lib/useRealtimeSubscription';

// Sort function for lotteries
const sortLotteries = (data: Lottery[]) => {
    return data.sort((a, b) => {
        if (a.status === '待开奖' && b.status !== '待开奖') return -1;
        if (a.status !== '待开奖' && b.status === '待开奖') return 1;
        const dateA = new Date(a.drawDate).getTime();
        const dateB = new Date(b.drawDate).getTime();
        return a.status === '待开奖' ? dateA - dateB : dateB - dateA;
    });
};

export default function LotteryPage() {
    const [lotteries, setLotteries] = useState<Lottery[]>([]);
    const [loading, setLoading] = useState(true);
    const [autoDrawResult, setAutoDrawResult] = useState<any>(null);

    // Prevent duplicate fetches (React StrictMode, fast re-renders)
    const fetchingRef = useRef(false);
    const lastFetchRef = useRef(0);

    const fetchLotteries = useCallback(async (isInitial = false) => {
        // Debounce: skip if fetched within last 500ms
        const now = Date.now();
        if (!isInitial && now - lastFetchRef.current < 500) return;
        if (fetchingRef.current) return;

        fetchingRef.current = true;
        lastFetchRef.current = now;

        try {
            const res = await fetch('/api/lottery');
            if (res.ok) {
                const data: Lottery[] = await res.json();
                setLotteries(sortLotteries(data));
            }
        } catch (error) {
            console.error('Error fetching lotteries:', error);
        } finally {
            fetchingRef.current = false;
        }
    }, []);

    // Prevent duplicate init (React StrictMode, fast re-renders)
    const initRef = useRef(false);

    useEffect(() => {
        async function init() {
            if (initRef.current) return;
            initRef.current = true;

            try {
                // Trigger auto-draw for any lotteries past their draw date
                try {
                    const autoDrawRes = await fetch('/api/lottery/auto-draw', { method: 'POST' });
                    if (autoDrawRes.ok) {
                        const result = await autoDrawRes.json();
                        if (result.summary && (result.summary.drawn > 0 || result.summary.extended > 0)) {
                            setAutoDrawResult(result);
                        }
                    }
                } catch (e) {
                    console.error('Auto-draw check failed:', e);
                }

                await fetchLotteries(true);
            } catch (error) {
                console.error('Error fetching lotteries:', error);
            } finally {
                setLoading(false);
            }
        }
        init();
    }, [fetchLotteries]);

    // Realtime subscription - memoized callback
    const handleRealtimeChange = useCallback(() => {
        fetchLotteries(false);
    }, [fetchLotteries]);

    useRealtimeSubscription(
        [{ table: 'lotteries' }, { table: 'lottery_entries' }],
        handleRealtimeChange
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
            </div>
        );
    }

    const activeLotteries = lotteries.filter(l => l.status === '待开奖');
    const endedLotteries = lotteries.filter(l => l.status === '已结束');

    return (
        <div className="p-6 max-w-7xl mx-auto min-h-screen">
            <div className="mb-12 text-center">
                <div className="inline-block p-3 bg-pink-100 text-pink-600 rounded-2xl mb-4">
                    <Gift size={32} />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2">积分抽奖</h2>
                <p className="text-gray-500">消耗积分参与抽奖，赢取丰厚奖品</p>
            </div>

            {/* Auto-draw notification */}
            {autoDrawResult && autoDrawResult.summary && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-start">
                        <AlertCircle size={20} className="text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-blue-800">系统自动处理</p>
                            <p className="text-sm text-blue-600">
                                {autoDrawResult.summary.drawn > 0 && `${autoDrawResult.summary.drawn} 个活动已开奖`}
                                {autoDrawResult.summary.drawn > 0 && autoDrawResult.summary.extended > 0 && '，'}
                                {autoDrawResult.summary.extended > 0 && `${autoDrawResult.summary.extended} 个活动因人数不足延长1天`}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Active Lotteries */}
            {activeLotteries.length > 0 && (
                <div className="mb-12">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                        进行中
                        <span className="text-sm font-normal text-gray-500 ml-2">({activeLotteries.length})</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {activeLotteries.map(l => (
                            <LotteryCard key={l.id} lottery={l} />
                        ))}
                    </div>
                </div>
            )}

            {/* Ended Lotteries */}
            {endedLotteries.length > 0 && (
                <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                        <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                        已结束
                        <span className="text-sm font-normal text-gray-500 ml-2">({endedLotteries.length})</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 opacity-75">
                        {endedLotteries.map(l => (
                            <LotteryCard key={l.id} lottery={l} isEnded />
                        ))}
                    </div>
                </div>
            )}

            {lotteries.length === 0 && (
                <div className="text-center py-20 text-gray-500">
                    暂无抽奖活动
                </div>
            )}
        </div>
    );
}

function LotteryCard({ lottery: l, isEnded = false }: { lottery: Lottery; isEnded?: boolean }) {
    return (
        <Link href={`/lottery/${l.id}`}>
            <Card className={`group flex flex-col h-full ${isEnded ? 'hover:shadow-md' : ''}`}>
                <div className="p-6 flex-1 flex flex-col cursor-pointer relative overflow-hidden">
                    <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-50 blur-2xl transition-colors ${isEnded ? 'bg-gray-100' : 'bg-pink-100 group-hover:bg-pink-200'}`}></div>

                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${isEnded ? 'bg-gray-100 text-gray-500' : 'bg-pink-50 text-pink-600'}`}>
                                抽奖
                            </span>
                            {l.hasEntered && (
                                <span className="text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-600">
                                    已参与
                                </span>
                            )}
                        </div>
                        <Badge status={l.status} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 relative z-10">{l.title}</h3>
                    <p className="text-gray-500 text-sm mb-6 line-clamp-2 relative z-10">{l.description}</p>

                    <div className="mt-auto relative z-10">
                        <div className="flex items-center text-sm text-gray-500 mb-2 bg-gray-50 p-2 rounded-lg">
                            <Clock size={16} className="mr-2" />
                            <span>{isEnded ? '已开奖' : '开奖'}: {formatBeijing(l.drawDate, 'yyyy-MM-dd HH:mm')}</span>
                        </div>

                        <div className="flex items-center text-sm text-gray-500 mb-4 bg-gray-50 p-2 rounded-lg">
                            <Users size={16} className="mr-2" />
                            <span>已参与: {l.participants || 0} 人</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-xl font-bold text-amber-500 flex items-center">
                                {l.entryCost} <span className="text-xs text-gray-400 font-normal ml-1">积分</span>
                            </span>
                            <span className={`px-5 py-2 rounded-full text-sm font-bold shadow-lg transition-all ${isEnded
                                ? 'bg-gray-400 text-white cursor-default'
                                : l.hasEntered
                                    ? 'bg-green-500 text-white shadow-green-200'
                                    : 'bg-pink-600 text-white shadow-pink-200 group-hover:bg-pink-700'
                                }`}>
                                {isEnded ? '查看结果' : l.hasEntered ? '已参与' : '去抽奖'}
                            </span>
                        </div>
                    </div>
                </div>
            </Card>
        </Link>
    );
}
