'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Gift, Clock, Users, ArrowRight, CheckCircle, Award, AlertCircle, Coins } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { pointsEvents } from '@/lib/events';

interface LotteryDetail {
    id: string;
    title: string;
    drawDate: string;
    winnersCount: number;
    entryCost: number;
    status: string;
    participants: number;
    description: string;
    prizes: string[];
    hasEntered: boolean;
    winners: Array<{ name: string; isWinner: boolean }>;
}

export default function LotteryDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [lottery, setLottery] = useState<LotteryDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [entering, setEntering] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<{ pointsSpent: number; newPoints: number } | null>(null);

    // Prevent duplicate fetches (React StrictMode, fast re-renders)
    const fetchingRef = useRef(false);

    const fetchLottery = useCallback(async (lotteryId: string) => {
        if (fetchingRef.current) return;
        fetchingRef.current = true;

        try {
            const res = await fetch(`/api/lottery/${lotteryId}`);
            if (res.ok) {
                const data = await res.json();
                setLottery(data);
            } else {
                router.replace('/lottery');
            }
        } catch (err) {
            console.error('Error fetching lottery:', err);
        } finally {
            setLoading(false);
            fetchingRef.current = false;
        }
    }, []);

    useEffect(() => {
        async function init() {
            if (!params.id) return;

            // Trigger auto-draw check before fetching lottery data
            // This ensures lottery status is up-to-date if draw time has passed
            try {
                await fetch('/api/lottery/auto-draw', { method: 'POST' });
            } catch (e) {
                console.error('Auto-draw check failed:', e);
            }

            fetchLottery(params.id as string);
        }
        init();
    }, [params.id, fetchLottery]);

    const handleEnter = async () => {
        if (entering) return;

        setEntering(true);
        setError(null);

        try {
            const res = await fetch(`/api/lottery/${params.id}`, { method: 'POST' });
            const data = await res.json();

            if (res.ok && data.success) {
                setSuccess({ pointsSpent: data.pointsSpent, newPoints: data.newPoints });
                // Emit points update to navbar
                pointsEvents.emit(data.newPoints);
                // Refresh lottery data
                fetchLottery(params.id as string);
            } else {
                setError(data.error || '参与失败');
            }
        } catch (err) {
            setError('网络错误，请稍后重试');
        } finally {
            setEntering(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
            </div>
        );
    }

    if (!lottery) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <p className="text-gray-500">抽奖不存在，正在跳转...</p>
            </div>
        );
    }

    const isPending = lottery.status === '待开奖';
    const isCompleted = lottery.status === '已结束';

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-900 mb-6 flex items-center transition-colors">
                <ArrowRight className="rotate-180 mr-2" size={16} /> 返回列表
            </button>

            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-8 md:p-12">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-pink-100 rounded-lg text-pink-600"><Gift size={20} /></div>
                        <Badge status={lottery.status} />
                        {lottery.hasEntered && (
                            <span className="text-xs font-bold bg-green-100 text-green-600 px-2 py-1 rounded">已参与</span>
                        )}
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-4">{lottery.title}</h1>
                    <p className="text-gray-600 leading-relaxed mb-8">{lottery.description}</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="bg-gray-50 p-4 rounded-xl text-center">
                            <Clock size={20} className="mx-auto mb-2 text-gray-400" />
                            <span className="text-sm text-gray-500 block">开奖时间</span>
                            <span className="font-bold text-gray-900">{lottery.drawDate?.split('T')[0]}</span>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl text-center">
                            <Users size={20} className="mx-auto mb-2 text-gray-400" />
                            <span className="text-sm text-gray-500 block">参与人数</span>
                            <span className="font-bold text-gray-900">{lottery.participants}</span>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl text-center">
                            <Gift size={20} className="mx-auto mb-2 text-gray-400" />
                            <span className="text-sm text-gray-500 block">中奖名额</span>
                            <span className="font-bold text-gray-900">{lottery.winnersCount}</span>
                        </div>
                    </div>

                    <div className="bg-pink-50 p-6 rounded-2xl mb-8">
                        <h3 className="font-bold text-gray-900 mb-4">奖品清单</h3>
                        <ul className="space-y-2">
                            {(lottery.prizes || []).map((p, i) => (
                                <li key={i} className="flex items-center text-gray-700">
                                    <CheckCircle size={18} className="mr-3 text-pink-500" /> {p}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="flex items-center justify-between p-6 bg-amber-50 rounded-2xl mb-8">
                        <div>
                            <span className="text-sm text-gray-500 block">参与所需积分</span>
                            <span className="text-3xl font-bold text-amber-600 flex items-center">
                                <Coins size={24} className="mr-2" /> {lottery.entryCost}
                            </span>
                        </div>
                    </div>

                    {/* Winners Section (when completed) */}
                    {isCompleted && lottery.winners && lottery.winners.length > 0 && (
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-2xl mb-8 border border-amber-200">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                                <Award className="mr-2 text-amber-500" /> 中奖名单
                            </h3>
                            <div className="flex flex-wrap gap-3">
                                {lottery.winners.map((winner, i) => (
                                    <div key={i} className="bg-white px-4 py-2 rounded-full shadow-sm border border-amber-200 flex items-center">
                                        <Award size={16} className="mr-2 text-amber-500" />
                                        <span className="font-medium text-gray-800">{winner.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center text-red-600">
                            <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Success Message */}
                    {success && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl text-green-700">
                            <div className="flex items-center mb-2">
                                <CheckCircle size={18} className="mr-2" />
                                <span className="font-bold">参与成功！</span>
                            </div>
                            <p className="text-sm">
                                已消耗 {success.pointsSpent} 积分，剩余 {success.newPoints} 积分。
                                开奖结果将在个人中心显示。
                            </p>
                        </div>
                    )}

                    {/* Action Button */}
                    {isPending && !lottery.hasEntered && !success && (
                        <button
                            onClick={handleEnter}
                            disabled={entering}
                            className="w-full py-4 rounded-xl font-bold text-white bg-pink-600 hover:bg-pink-700 shadow-lg shadow-pink-200 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {entering ? '处理中...' : `立即参与 (消耗 ${lottery.entryCost} 积分)`}
                        </button>
                    )}

                    {isPending && (lottery.hasEntered || success) && (
                        <div className="text-center py-6 bg-green-50 rounded-xl text-green-700">
                            <CheckCircle size={24} className="mx-auto mb-2" />
                            <p className="font-bold">您已成功参与该抽奖！</p>
                            <p className="text-sm mt-1">请等待开奖，结果将在个人中心显示</p>
                        </div>
                    )}

                    {isCompleted && (
                        <div className="text-center py-8 text-gray-500">
                            该抽奖已结束
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
