'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Users, Lock, Edit2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { GroupBuy } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { useRealtimeSubscription } from '@/lib/useRealtimeSubscription';

interface UserParticipation {
    [groupId: string]: number; // groupId -> user's quantity
}

export default function GroupsPage() {
    const [groups, setGroups] = useState<GroupBuy[]>([]);
    const [loading, setLoading] = useState(true);
    const [userParticipations, setUserParticipations] = useState<UserParticipation>({});

    // Prevent duplicate fetches (React StrictMode, fast re-renders)
    const fetchingRef = useRef(false);
    const lastFetchRef = useRef(0);

    const fetchGroups = useCallback(async (isInitial = false) => {
        // Debounce: skip if fetched within last 500ms
        const now = Date.now();
        if (!isInitial && now - lastFetchRef.current < 500) return;
        if (fetchingRef.current) return;

        fetchingRef.current = true;
        lastFetchRef.current = now;

        try {
            const res = await fetch('/api/groups');
            if (res.ok) {
                const data = await res.json();
                setGroups(data);
            }
        } catch (error) {
            console.error('Error fetching groups:', error);
        } finally {
            fetchingRef.current = false;
        }
    }, []);

    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch groups
                await fetchGroups(true);

                // Check user participation
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: participations } = await supabase
                        .from('group_participants')
                        .select('group_id, quantity')
                        .eq('user_id', user.id);

                    if (participations) {
                        const map: UserParticipation = {};
                        participations.forEach(p => {
                            map[p.group_id] = (map[p.group_id] || 0) + (p.quantity || 1);
                        });
                        setUserParticipations(map);
                    }
                }
            } catch (error) {
                console.error('Error fetching groups:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [fetchGroups]);

    // Realtime subscription - memoized callback
    const handleRealtimeChange = useCallback(() => {
        fetchGroups(false);
    }, [fetchGroups]);

    useRealtimeSubscription(
        [{ table: 'group_buys' }, { table: 'group_participants' }],
        handleRealtimeChange
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    // Separate groups by availability
    const availableGroups = groups.filter(g => g.status === '进行中');
    const lockedGroups = groups.filter(g => g.status !== '进行中');

    const GroupCard = ({ g }: { g: GroupBuy }) => {
        const userQty = userParticipations[g.id] || 0;
        const hasParticipated = userQty > 0;

        return (
            <Link href={`/groups/${g.id}`}>
                <Card className="group flex flex-col h-full">
                    <div className="p-6 flex-1 flex flex-col cursor-pointer">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded uppercase">Group Buy</span>
                                {hasParticipated && (
                                    <span className="text-xs font-bold bg-green-100 text-green-600 px-2 py-1 rounded">
                                        已参与 {userQty}份
                                    </span>
                                )}
                            </div>
                            <Badge status={g.status} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">{g.title}</h3>
                        <p className="text-gray-500 text-sm mb-6 line-clamp-2">{g.description}</p>

                        <div className="mt-auto">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>当前人数: {g.currentCount}</span>
                                <span>目标: {g.targetCount}</span>
                            </div>
                            <ProgressBar current={g.currentCount} target={g.targetCount} />

                            <div className="mt-6 flex items-center justify-between">
                                <span className="text-2xl font-bold text-gray-900">¥{g.price}<span className="text-sm font-normal text-gray-400">/人</span></span>

                                {g.status === '已结束' ? (
                                    // 已结束的团统一显示已结束
                                    <span className="bg-gray-100 text-gray-400 px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed flex items-center">
                                        <Lock size={14} className="mr-1" />
                                        已结束
                                    </span>
                                ) : g.status === '已锁单' ? (
                                    hasParticipated ? (
                                        // 用户参与了的锁团，显示修改信息
                                        <span className="bg-amber-50 text-amber-600 border border-amber-200 px-4 py-2 rounded-lg text-sm font-medium group-hover:bg-amber-100 transition-colors flex items-center">
                                            <Edit2 size={14} className="mr-1" />
                                            修改信息
                                        </span>
                                    ) : (
                                        // 用户未参与的锁团，显示已满员
                                        <span className="bg-gray-100 text-gray-400 px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed flex items-center">
                                            <Lock size={14} className="mr-1" />
                                            已满员
                                        </span>
                                    )
                                ) : hasParticipated ? (
                                    <span className="bg-amber-50 text-amber-600 border border-amber-200 px-4 py-2 rounded-lg text-sm font-medium group-hover:bg-amber-100 transition-colors flex items-center">
                                        <Edit2 size={14} className="mr-1" />
                                        修改信息
                                    </span>
                                ) : (
                                    <span className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium group-hover:bg-indigo-700 transition-colors">
                                        点击参与
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>
            </Link>
        );
    };

    return (
        <div className="p-6 max-w-7xl mx-auto min-h-screen">
            <div className="mb-12 text-center">
                <div className="inline-block p-3 bg-indigo-100 text-indigo-600 rounded-2xl mb-4">
                    <Users size={32} />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2">拼团合租</h2>
                <p className="text-gray-500">寻找志同道合的伙伴，共享优质数字服务</p>
            </div>

            {/* Available Groups */}
            {availableGroups.length > 0 && (
                <div className="mb-12">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                        <span className="w-3 h-3 rounded-full bg-green-500 mr-3"></span>
                        可参与的拼团 ({availableGroups.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {availableGroups.map(g => <GroupCard key={g.id} g={g} />)}
                    </div>
                </div>
            )}

            {/* Locked/Ended Groups */}
            {lockedGroups.length > 0 && (
                <div>
                    <h3 className="text-xl font-bold text-gray-500 mb-6 flex items-center">
                        <span className="w-3 h-3 rounded-full bg-gray-400 mr-3"></span>
                        已满员/已结束 ({lockedGroups.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 opacity-70">
                        {lockedGroups.map(g => <GroupCard key={g.id} g={g} />)}
                    </div>
                </div>
            )}

            {groups.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                    <Users size={48} className="mx-auto mb-4 opacity-30" />
                    <p>暂无拼团活动</p>
                </div>
            )}
        </div>
    );
}
