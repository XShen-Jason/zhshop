'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Gift, Clock, Users, Trophy, AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ContactSelector } from '@/components/ContactSelector';
import { createClient } from '@/lib/supabase/client';
import { formatBeijing } from '@/lib/timezone';
import { Lottery } from '@/types';

// Extended type for detail view
interface LotteryDetail extends Lottery {
    prizes: string[];
    winners?: { name: string; isWinner: boolean }[];
    description: string;
}

export default function LotteryDetailPage() {
    const router = useRouter();
    const params = useParams();
    const [lottery, setLottery] = useState<LotteryDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [contactInfo, setContactInfo] = useState('');

    // Prevent duplicate fetches
    const fetchingRef = useRef(false);

    const fetchLottery = useCallback(async (lotteryId: string) => {
        if (fetchingRef.current) return;
        fetchingRef.current = true;
        setError(null);

        try {
            const res = await fetch(`/api/lottery/${lotteryId}`);
            if (res.ok) {
                const data = await res.json();
                setLottery(data);
            } else {
                if (res.status === 404) {
                    setError('找不到该抽奖活动');
                } else {
                    setError('获取数据失败');
                }
            }
        } catch (error) {
            console.error('Error fetching lottery:', error);
            setError('网络错误，请稍后重试');
        } finally {
            setLoading(false);
            fetchingRef.current = false;
        }
    }, []);

    useEffect(() => {
        if (params.id) {
            fetchLottery(params.id as string);
        }
    }, [params.id, fetchLottery]);

    const handleEnter = async () => {
        if (!lottery) return;

        // Check auth first
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            // Redirect to login with return URL
            const returnUrl = encodeURIComponent(`/lottery/${lottery.id}`);
            router.push(`/auth/login?redirect=${returnUrl}`);
            return;
        }

        if (!contactInfo) {
            alert('请选择中奖联系方式');
            return;
        }

        if (!confirm(`确定消耗 ${lottery.entryCost} 积分参与此次抽奖吗？`)) return;

        setActionLoading(true);
        try {
            const res = await fetch(`/api/lottery/${lottery.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contactInfo })
            });

            const data = await res.json();

            if (res.ok) {
                alert('参与成功！祝您好运！');
                // Refresh data
                window.location.reload();
            } else {
                alert(data.error || '参与失败');
            }
        } catch (error) {
            console.error('Error entering lottery:', error);
            alert('网络错误');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
            </div>
        );
    }

    if (error || !lottery) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
                <AlertTriangle size={48} className="text-amber-500 mb-4" />
                <h2 className="text-xl font-bold text-gray-800 mb-2">{error || '抽奖不存在'}</h2>
                <Link href="/lottery" className="mt-4 px-6 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition">
                    返回列表
                </Link>
            </div>
        );
    }

    const isEnded = lottery.status === '已结束';
    const canEnter = lottery.status === '待开奖' && !lottery.hasEntered;

    return (
        <div className="max-w-4xl mx-auto p-6 min-h-screen">
            <Link href="/lottery" className="inline-flex items-center text-gray-500 hover:text-gray-900 mb-6 transition">
                <ArrowLeft size={18} className="mr-1" /> 返回列表
            </Link>

            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                {/* Header Section */}
                <div className="bg-gradient-to-br from-pink-500 to-rose-600 p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>

                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <Badge status={lottery.status} className="bg-white/20 text-white border-white/20 backdrop-blur-md" />
                            <div className="flex items-center space-x-2">
                                <span className="flex items-center bg-black/20 px-3 py-1 rounded-full text-sm backdrop-blur-md">
                                    <Trophy size={14} className="mr-1.5 text-yellow-300" />
                                    {lottery.winnersCount} 名中奖者
                                </span>
                            </div>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight">{lottery.title}</h1>
                        <div className="flex flex-wrap items-center gap-4 text-pink-100 font-medium">
                            <span className="flex items-center bg-white/10 px-3 py-1.5 rounded-lg">
                                <Clock size={16} className="mr-2" />
                                {formatBeijing(lottery.drawDate, 'yyyy-MM-dd HH:mm')} 开奖
                            </span>
                            <span className="flex items-center bg-white/10 px-3 py-1.5 rounded-lg">
                                <Users size={16} className="mr-2" />
                                {lottery.participants} 人已参与
                            </span>
                        </div>
                    </div>
                </div>

                <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Left Info */}
                        <div className="md:col-span-2 space-y-8">
                            <section>
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                    <Gift size={20} className="mr-2 text-pink-500" />
                                    活动详情
                                </h3>
                                <div className="text-gray-600 leading-relaxed bg-gray-50 p-6 rounded-2xl">
                                    {lottery.description}
                                </div>
                            </section>

                            <section>
                                <h3 className="text-lg font-bold text-gray-900 mb-4">奖品列表</h3>
                                <ul className="space-y-3">
                                    {lottery.prizes && lottery.prizes.length > 0 ? (
                                        lottery.prizes.map((prize, idx) => (
                                            <li key={idx} className="flex items-center bg-pink-50 text-pink-800 px-4 py-3 rounded-xl border border-pink-100">
                                                <Gift size={16} className="mr-3 flex-shrink-0" />
                                                <span>{prize}</span>
                                            </li>
                                        ))
                                    ) : (
                                        <li className="text-gray-400 italic">暂无具体奖品显示</li>
                                    )}
                                </ul>
                            </section>

                            {/* Winner List (if ended) */}
                            {isEnded && lottery.winners && lottery.winners.length > 0 && (
                                <section>
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                        <Trophy size={20} className="mr-2 text-amber-500" />
                                        中奖名单
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {lottery.winners.map((winner, idx) => (
                                            <div key={idx} className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-center justify-between">
                                                <span className="font-bold text-gray-800">{winner.name}</span>
                                                <span className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded font-bold">WINNER</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>

                        {/* Right Sidebar */}
                        <div className="md:col-span-1">
                            <Card className="p-6 sticky top-8 border-pink-100 shadow-lg bg-white/50 backdrop-blur-sm">
                                <div className="text-center mb-6">
                                    <p className="text-sm text-gray-500 mb-1">参与消耗</p>
                                    <div className="text-3xl font-extrabold text-gray-900">
                                        {lottery.entryCost} <span className="text-base text-gray-400 font-normal">积分</span>
                                    </div>
                                </div>

                                {isEnded ? (
                                    <button
                                        disabled
                                        className="w-full py-3 rounded-xl font-bold bg-gray-100 text-gray-400 cursor-not-allowed mb-4"
                                    >
                                        活动已结束
                                    </button>
                                ) : lottery.hasEntered ? (
                                    <div className="text-center mb-4">
                                        <div className="w-full py-3 rounded-xl font-bold bg-green-100 text-green-700 flex items-center justify-center mb-2">
                                            <Users size={18} className="mr-2" />
                                            已参与
                                        </div>
                                        <p className="text-xs text-gray-400">请耐心等待开奖</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="mb-4 text-left">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                                                中奖联系方式
                                            </label>
                                            <ContactSelector
                                                value={contactInfo}
                                                onChange={setContactInfo}
                                                placeholder="请选择联系方式"
                                            />
                                        </div>
                                        <button
                                            onClick={handleEnter}
                                            disabled={actionLoading}
                                            className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 shadow-lg shadow-pink-200 transform transition active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            {actionLoading ? '处理中...' : '立即参与'}
                                        </button>
                                    </>
                                )}

                                <div className="border-t border-gray-100 pt-6 mt-6">
                                    <h4 className="font-bold text-gray-800 mb-2 text-sm">参与规则</h4>
                                    <ul className="text-xs text-gray-500 space-y-2">
                                        <li>• 参与需消耗 {lottery.entryCost} 积分</li>
                                        <li>• 积分一旦扣除概不退还</li>
                                        <li>• 系统将在开奖时间自动开奖</li>
                                        <li>• 中奖结果将在个人中心显示</li>
                                    </ul>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
