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

    // Use promise ref to handle concurrent fetches (Strict Mode safe)
    const activeFetchPromise = useRef<Promise<any> | null>(null);
    const lastFetchRef = useRef(0);

    const fetchGroups = useCallback(async (isInitial = false) => {
        // Debounce only for non-initial
        const now = Date.now();
        if (!isInitial && now - lastFetchRef.current < 500) return null;

        // If there's an active promise, return it
        if (activeFetchPromise.current) {
            return activeFetchPromise.current;
        }

        const fetchPromise = (async () => {
            try {
                const res = await fetch('/api/groups');
                if (res.ok) {
                    const data = await res.json();
                    setGroups(data);
                    lastFetchRef.current = Date.now();
                    return data;
                }
            } catch (error) {
                console.error('Error fetching groups:', error);
            } finally {
                activeFetchPromise.current = null;
            }
            return null;
        })();

        activeFetchPromise.current = fetchPromise;
        return fetchPromise;
    }, []);

    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch groups
                const data = await fetchGroups(true);

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
                // Only turn off loading if data was attempted to be fetched or if we have data
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
                    <div className="p-3 md:p-6 flex-1 flex flex-col cursor-pointer">
                        <div className="flex justify-between items-start mb-2 md:mb-4">
                            <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                                <span className="text-[10px] md:text-xs font-bold bg-gray-100 text-gray-600 px-1.5 md:px-2 py-0.5 md:py-1 rounded uppercase">Group Buy</span>
                                {hasParticipated && (
                                    <span className="text-[10px] md:text-xs font-bold bg-green-100 text-green-600 px-1.5 md:px-2 py-0.5 md:py-1 rounded">
                                        已参与{userQty}份
                                    </span>
                                )}
                            </div>
                            <Badge status={g.status} className="text-[10px] md:text-xs" />
                        </div>
                        <h3 className="text-sm md:text-xl font-bold text-gray-900 mb-1 md:mb-2 group-hover:text-indigo-600 transition-colors flex items-center gap-1 md:gap-2 line-clamp-1">
                            {g.title.replace(/ #\d+$/, '')}
                            {/ #(\d+)$/.test(g.title) && (
                                <span className="inline-flex items-center justify-center min-w-[18px] md:min-w-[22px] h-[18px] md:h-[22px] px-1 md:px-1.5 bg-indigo-100 text-indigo-600 text-[10px] md:text-xs font-bold rounded-full">
                                    {g.title.match(/ #(\d+)$/)?.[1]}
                                </span>
                            )}
                        </h3>
                        <p className="hidden md:block text-gray-500 text-sm mb-6 line-clamp-2">{g.description}</p>

                        <div className="mt-auto">
                            <div className="flex justify-between text-[10px] md:text-xs text-gray-500 mb-1">
                                <span>当前: {g.currentCount}</span>
                                <span>目标: {g.targetCount}</span>
                            </div>
                            <ProgressBar current={g.currentCount} target={g.targetCount} />

                            <div className="mt-3 md:mt-6 flex items-center justify-between">
                                <span className="text-base md:text-2xl font-bold text-gray-900">￥{g.price}<span className="text-[10px] md:text-sm font-normal text-gray-400">/人</span></span>

                                {g.status === '已结束' ? (
                                    <span className="bg-gray-100 text-gray-400 px-2 md:px-4 py-1.5 md:py-2 rounded-lg text-[10px] md:text-sm font-medium cursor-not-allowed flex items-center">
                                        <Lock size={12} className="mr-0.5 md:mr-1 md:w-3.5 md:h-3.5" />
                                        已结束
                                    </span>
                                ) : g.status === '已锁单' ? (
                                    hasParticipated ? (
                                        <span className="bg-amber-50 text-amber-600 border border-amber-200 px-2 md:px-4 py-1.5 md:py-2 rounded-lg text-[10px] md:text-sm font-medium group-hover:bg-amber-100 transition-colors flex items-center">
                                            <Edit2 size={12} className="mr-0.5 md:mr-1 md:w-3.5 md:h-3.5" />
                                            修改
                                        </span>
                                    ) : (
                                        <span className="bg-gray-100 text-gray-400 px-2 md:px-4 py-1.5 md:py-2 rounded-lg text-[10px] md:text-sm font-medium cursor-not-allowed flex items-center">
                                            <Lock size={12} className="mr-0.5 md:mr-1 md:w-3.5 md:h-3.5" />
                                            已满
                                        </span>
                                    )
                                ) : hasParticipated ? (
                                    <span className="bg-amber-50 text-amber-600 border border-amber-200 px-2 md:px-4 py-1.5 md:py-2 rounded-lg text-[10px] md:text-sm font-medium group-hover:bg-amber-100 transition-colors flex items-center">
                                        <Edit2 size={12} className="mr-0.5 md:mr-1 md:w-3.5 md:h-3.5" />
                                        修改
                                    </span>
                                ) : (
                                    <span className="bg-indigo-600 text-white px-2 md:px-4 py-1.5 md:py-2 rounded-lg text-[10px] md:text-sm font-medium group-hover:bg-indigo-700 transition-colors">
                                        参与
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
        <div className="p-4 md:p-6 max-w-7xl mx-auto min-h-screen">
            <div className="mb-6 md:mb-12 text-center">
                <div className="inline-block p-2 md:p-3 bg-indigo-100 text-indigo-600 rounded-xl md:rounded-2xl mb-2 md:mb-4">
                    <Users size={24} className="md:w-8 md:h-8" />
                </div>
                <h2 className="text-xl md:text-3xl font-extrabold text-gray-900 mb-1 md:mb-2">拼团合租</h2>
                <p className="text-xs md:text-base text-gray-500">寻找志同道合的伙伴，共享优质数字服务</p>
            </div>

            {/* Available Groups */}
            {availableGroups.length > 0 && (
                <div className="mb-6 md:mb-12">
                    <h3 className="text-base md:text-xl font-bold text-gray-800 mb-3 md:mb-6 flex items-center">
                        <span className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-green-500 mr-2 md:mr-3"></span>
                        可参与 ({availableGroups.length})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-8">
                        {availableGroups.map(g => <GroupCard key={g.id} g={g} />)}
                    </div>
                </div>
            )}

            {/* Locked/Ended Groups */}
            {lockedGroups.length > 0 && (
                <div>
                    <h3 className="text-base md:text-xl font-bold text-gray-500 mb-3 md:mb-6 flex items-center">
                        <span className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-gray-400 mr-2 md:mr-3"></span>
                        已满/已结 ({lockedGroups.length})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-8 opacity-70">
                        {lockedGroups.map(g => <GroupCard key={g.id} g={g} />)}
                    </div>
                </div>
            )}

            {groups.length === 0 && (
                <div className="text-center py-10 md:py-16 text-gray-400">
                    <Users size={36} className="mx-auto mb-3 md:mb-4 opacity-30 md:w-12 md:h-12" />
                    <p className="text-sm md:text-base">暂无拼团活动</p>
                </div>
            )}
        </div>
    );
}
