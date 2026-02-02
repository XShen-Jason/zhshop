'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, Users, ArrowRight, Edit2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ModifyParticipationModal } from '@/components/ModifyParticipationModal';
import { GroupBuy } from '@/types';
import { createClient } from '@/lib/supabase/client';

interface UserParticipation {
    quantity: number;
    contactInfo: string;
}

export default function GroupDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [group, setGroup] = useState<GroupBuy | null>(null);
    const [loading, setLoading] = useState(true);
    const [userParticipation, setUserParticipation] = useState<UserParticipation | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Prevent duplicate fetches (React StrictMode, fast re-renders)
    const fetchingRef = useRef(false);
    const lastFetchRef = useRef(0);

    const fetchGroupData = useCallback(async (groupId: string, isInitial = false) => {
        // Debounce: skip if fetched within last 500ms
        const now = Date.now();
        if (!isInitial && now - lastFetchRef.current < 500) return null;

        lastFetchRef.current = now;

        try {
            const res = await fetch(`/api/groups/${groupId}`);
            if (res.ok) {
                const data = await res.json();
                setGroup(data);
                return data;
            } else {
                router.replace('/groups');
                return null;
            }
        } catch (error) {
            console.error('Error fetching group:', error);
            return null;
        }
    }, [router]);

    useEffect(() => {
        async function fetchData() {
            if (!params.id) return;

            // Prevent duplicate execution
            if (fetchingRef.current) return;
            fetchingRef.current = true;

            try {
                // Fetch group
                const groupData = await fetchGroupData(params.id as string, true);

                // Only proceed if group exists
                if (groupData) {
                    // Check if user is logged in and has participation
                    const supabase = createClient();
                    const { data: { user } } = await supabase.auth.getUser();
                    setIsLoggedIn(!!user);

                    if (user) {
                        // Fetch user's participation in this group
                        const { data: participations } = await supabase
                            .from('group_participants')
                            .select('quantity, contact_info')
                            .eq('group_id', params.id)
                            .eq('user_id', user.id);

                        if (participations && participations.length > 0) {
                            const totalQty = participations.reduce((sum, p) => sum + (p.quantity || 1), 0);
                            setUserParticipation({
                                quantity: totalQty,
                                contactInfo: participations[0].contact_info || ''
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching group:', error);
            } finally {
                setLoading(false);
                fetchingRef.current = false;
            }
        }
        fetchData();
    }, [params.id, fetchGroupData]);

    const handleSuccess = () => {
        // Refresh data
        window.location.reload();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!group) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <p className="text-gray-500">拼团不存在，正在跳转...</p>
            </div>
        );
    }

    const isActive = group.status === '进行中';
    const hasParticipation = userParticipation !== null;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-900 mb-6 flex items-center transition-colors">
                <ArrowRight className="rotate-180 mr-2" size={16} /> 返回列表
            </button>
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-8 md:p-12">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><Users size={20} /></div>
                        <Badge status={group.status} />
                        {hasParticipation && (
                            <span className="text-xs font-bold bg-green-100 text-green-600 px-2 py-1 rounded">
                                您已参与 ({userParticipation.quantity} 份)
                            </span>
                        )}
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-4">{group.title}</h1>
                    <p className="text-gray-600 leading-relaxed mb-8">{group.description}</p>

                    <div className="bg-gray-50 p-6 rounded-2xl mb-8">
                        <div className="flex justify-between text-sm text-gray-500 mb-2">
                            <span>当前人数: {group.currentCount}</span>
                            <span>目标: {group.targetCount}</span>
                        </div>
                        <ProgressBar current={group.currentCount} target={group.targetCount} />
                    </div>

                    <div className="bg-gray-50 p-6 rounded-2xl mb-8">
                        <h3 className="font-bold text-gray-900 mb-4">包含内容</h3>
                        <ul className="space-y-2">
                            {(group.features || []).map((f, i) => (
                                <li key={i} className="flex items-center text-gray-700">
                                    <CheckCircle size={18} className="mr-3 text-green-500" /> {f}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="flex items-center justify-between p-6 bg-indigo-50 rounded-2xl mb-8">
                        <div>
                            <span className="text-sm text-gray-500 block">每人费用</span>
                            <span className="text-3xl font-bold text-indigo-600">¥{group.price}</span>
                        </div>
                    </div>

                    {/* User has participated - show modify button */}
                    {hasParticipation && isActive && (
                        <div className="space-y-4">
                            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                                <p className="text-green-800 font-medium mb-1">您已加入此拼团</p>
                                <p className="text-sm text-green-600">
                                    当前份数: {userParticipation.quantity} | 联系方式: {userParticipation.contactInfo || '未填写'}
                                </p>
                            </div>
                            <button
                                onClick={() => setModalOpen(true)}
                                className="w-full py-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center"
                            >
                                <Edit2 size={18} className="mr-2" /> 修改信息
                            </button>
                        </div>
                    )}

                    {/* User has participated but group is locked (still modifiable with warning) */}
                    {hasParticipation && group.status === '已锁单' && (
                        <div className="space-y-4">
                            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                                <p className="text-amber-800 font-medium">⚠️ 该团已锁单（满员）</p>
                                <p className="text-sm text-amber-600">
                                    您仍可修改参与信息或取消参与，取消后可能触发成员迁移
                                </p>
                            </div>
                            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                                <p className="text-green-800 font-medium">您已加入此拼团</p>
                                <p className="text-sm text-green-600">
                                    当前份数: {userParticipation.quantity} | 联系方式: {userParticipation.contactInfo || '未填写'}
                                </p>
                            </div>
                            <button
                                onClick={() => setModalOpen(true)}
                                className="w-full py-4 rounded-xl font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-200 transition-all active:scale-95 flex items-center justify-center"
                            >
                                <Edit2 size={18} className="mr-2" /> 修改信息（已锁单）
                            </button>
                        </div>
                    )}

                    {/* User has participated but group is ended (not modifiable) */}
                    {hasParticipation && group.status === '已结束' && (
                        <div className="p-4 bg-gray-50 rounded-xl text-center">
                            <p className="text-gray-600">该拼团已结束，无法修改</p>
                            <p className="text-sm text-gray-400 mt-1">
                                您的参与: {userParticipation.quantity} 份
                            </p>
                        </div>
                    )}

                    {/* User hasn't participated and group is active */}
                    {!hasParticipation && isActive && group.currentCount < group.targetCount && (
                        <button
                            onClick={() => {
                                if (!isLoggedIn) {
                                    router.push('/auth/login');
                                    return;
                                }
                                setModalOpen(true);
                            }}
                            className="w-full py-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95"
                        >
                            加入拼团
                        </button>
                    )}

                    {/* Group is full */}
                    {!hasParticipation && group.currentCount >= group.targetCount && (
                        <div className="text-center py-8 bg-gray-50 rounded-2xl text-gray-500 font-bold">
                            该拼团已满员
                        </div>
                    )}

                    {/* Group is not active */}
                    {!hasParticipation && !isActive && (
                        <div className="text-center py-8 text-gray-500">
                            该拼团已 {group.status}，无法加入
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            <ModifyParticipationModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                groupId={group.id}
                groupTitle={group.title}
                groupPrice={group.price}
                targetCount={group.targetCount}
                currentCount={group.currentCount}
                userQuantity={userParticipation?.quantity || 0}
                userContactInfo={userParticipation?.contactInfo}
                onSuccess={handleSuccess}
                isNewParticipation={!hasParticipation}
            />
        </div>
    );
}
