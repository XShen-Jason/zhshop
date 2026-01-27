'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User as UserIcon, Gift, ShoppingBag, Clock, ChevronRight, LogOut, Award, Calendar, Coins, Trophy, ArrowRight, TrendingUp, TrendingDown, Users, Edit2, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ModifyParticipationModal } from '@/components/ModifyParticipationModal';
import { ContactEditModal } from '@/components/ContactEditModal';
import { ModifyOrderModal } from '@/components/ModifyOrderModal';
import { createClient } from '@/lib/supabase/client';
import { Order } from '@/types';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface UserProfile {
    id: string;
    name: string;
    email: string;
    role: string;
    points: number;
    checkInStreak: number;
}

interface LotteryEntry {
    id: string;
    lotteryId: string;
    enteredAt: string;
    isWinner: boolean;
    contactInfo?: string;
    lottery: {
        id: string;
        title: string;
        status: string;
        drawDate: string;
        entryCost: number;
        prizes: string[];
    } | null;
}

interface GroupEntry {
    participationId: string;
    groupId: string;
    group: {
        id: string;
        title: string;
        price: number;
        status: string;
        targetCount: number;
        currentCount: number;
    } | null;
    quantity: number;
    contactInfo: string;
    joinedAt: string;
    status: string;
}

export default function UserPage() {
    const router = useRouter();
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [lotteries, setLotteries] = useState<LotteryEntry[]>([]);
    const [groups, setGroups] = useState<GroupEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'orders' | 'lotteries' | 'groups'>('orders');
    const [actionLoading, setActionLoading] = useState(false);
    const [editingGroup, setEditingGroup] = useState<GroupEntry | null>(null);
    const [editingContact, setEditingContact] = useState<{
        type: 'order' | 'lottery' | 'group';
        id: string;
        title: string;
        contact: string;
    } | null>(null);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);

    // Prevent duplicate fetches (React StrictMode, fast re-renders)
    const fetchingRef = useRef(false);

    const fetchData = useCallback(async () => {
        if (fetchingRef.current) return;
        fetchingRef.current = true;

        try {
            // Single API call to get all user data
            const res = await fetch('/api/user/dashboard');

            if (!res.ok) {
                if (res.status === 401) {
                    router.push('/auth/login');
                    return;
                }
                throw new Error('Failed to fetch dashboard');
            }

            const data = await res.json();

            // Set user from profile data
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            // Set all data from single response
            setProfile(data.profile);
            setOrders(data.orders || []);
            setLotteries(data.lotteries || []);
            setGroups(data.groups || []);
        } catch (error) {
            console.error('Error fetching user data:', error);
            router.push('/auth/login');
        } finally {
            setLoading(false);
            fetchingRef.current = false;
        }
    }, [router]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    };

    const pendingCount = orders.filter(o => o.status === '待联系').length;
    const wonCount = lotteries.filter(l => l.isWinner).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!profile) {
        return null;
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* User Header */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-8 flex flex-col md:flex-row items-center justify-between">
                <div className="flex items-center space-x-6 mb-6 md:mb-0">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-lg">
                        <UserIcon size={36} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">{profile.name}</h1>
                        <p className="text-gray-500">{profile.email}</p>
                        <div className="mt-2 flex items-center space-x-2">
                            <span className="inline-flex items-center bg-gray-100 px-3 py-1 rounded-full text-xs font-bold text-gray-600">
                                {profile.role === 'ADMIN' ? '管理员' : '普通用户'}
                            </span>
                            {profile.checkInStreak > 0 && (
                                <span className="inline-flex items-center bg-green-100 px-3 py-1 rounded-full text-xs font-bold text-green-600">
                                    <Calendar size={12} className="mr-1" />
                                    连续{profile.checkInStreak}天
                                </span>
                            )}
                            <button
                                onClick={handleLogout}
                                className="inline-flex items-center bg-red-50 px-3 py-1 rounded-full text-xs font-bold text-red-600 hover:bg-red-100 transition"
                            >
                                <LogOut size={12} className="mr-1" />
                                退出
                            </button>
                        </div>
                    </div>
                </div>
                <Link href="/points" className="bg-gradient-to-r from-amber-50 to-orange-50 px-8 py-4 rounded-2xl border border-amber-100 flex items-center space-x-4 hover:shadow-md transition-all cursor-pointer">
                    <div className="p-3 bg-white rounded-full text-amber-500 shadow-sm">
                        <Coins size={24} />
                    </div>
                    <div>
                        <div className="text-xs text-amber-700 uppercase font-bold tracking-wider flex items-center">
                            我的积分 <ArrowRight size={12} className="ml-1 opacity-50" />
                        </div>
                        <div className="text-2xl font-extrabold text-gray-900">{profile.points}</div>
                    </div>
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                <Card className="p-6 bg-gradient-to-br from-blue-50 to-white border-blue-100">
                    <h3 className="text-blue-900 font-bold mb-2 text-lg">全部订单</h3>
                    <p className="text-3xl font-extrabold text-blue-600">{orders.length}</p>
                </Card>
                <Card className="p-6 bg-gradient-to-br from-purple-50 to-white border-purple-100">
                    <h3 className="text-purple-900 font-bold mb-2 text-lg">待联系</h3>
                    <p className="text-3xl font-extrabold text-purple-600">{pendingCount}</p>
                </Card>
                <Card className="p-6 bg-gradient-to-br from-pink-50 to-white border-pink-100">
                    <h3 className="text-pink-900 font-bold mb-2 text-lg">抽奖中奖</h3>
                    <p className="text-3xl font-extrabold text-pink-600">{wonCount}/{lotteries.length}</p>
                </Card>
                <Card className="p-6 bg-gradient-to-br from-green-50 to-white border-green-100">
                    <h3 className="text-green-900 font-bold mb-2 text-lg">拼团锁定</h3>
                    <p className="text-3xl font-extrabold text-green-600">{groups.filter(g => g.group?.status === '已锁单' || g.group?.status === '已结束').length}/{groups.length}</p>
                </Card>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-2 mb-6">
                <button
                    onClick={() => setActiveTab('orders')}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'orders'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    <ShoppingBag size={16} className="inline mr-2" />
                    订单记录
                </button>
                <button
                    onClick={() => setActiveTab('groups')}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'groups'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    <Users size={16} className="inline mr-2" />
                    拼团记录
                </button>
                <button
                    onClick={() => setActiveTab('lotteries')}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'lotteries'
                        ? 'bg-pink-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    <Gift size={16} className="inline mr-2" />
                    抽奖记录
                </button>
            </div>

            {/* Orders Tab */}
            {activeTab === 'orders' && (
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-xl text-gray-800">订单记录</h3>
                    </div>
                    {orders.length === 0 ? (
                        <div className="p-16 text-center text-gray-400 flex flex-col items-center">
                            <ShoppingBag size={48} className="mb-4 opacity-20" />
                            <p>暂无订单记录</p>
                            <Link href="/products" className="mt-4 text-indigo-600 font-medium hover:underline">
                                去选购商品 →
                            </Link>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {orders.map(order => {
                                const detailLink = order.itemType === 'PRODUCT' ? `/products/${order.itemId}` :
                                    order.itemType === 'GROUP' ? `/groups/${order.itemId}` : null;
                                const content = (
                                    <div className="p-6 md:p-8 hover:bg-gray-50/80 transition flex flex-col md:flex-row justify-between items-start md:items-center group">
                                        <div className="mb-4 md:mb-0">
                                            <div className="flex items-center mb-2">
                                                <h4 className="font-bold text-lg text-gray-900 mr-3 group-hover:text-indigo-600 transition-colors">{order.itemName}</h4>
                                                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{
                                                    order.itemType === 'PRODUCT' ? '商品' :
                                                        order.itemType === 'GROUP' ? '拼车' : '抽奖'
                                                }</span>
                                            </div>
                                            <div className="text-sm text-gray-500 flex items-center space-x-4">
                                                <span className="flex items-center"><Clock size={14} className="mr-1.5" /> {order.createdAt?.split('T')[0]}</span>
                                                {order.quantity && order.quantity > 1 && (
                                                    <>
                                                        <span className="text-gray-300">|</span>
                                                        <span className="font-medium text-gray-600">× {order.quantity}</span>
                                                    </>
                                                )}
                                                {order.cost && (
                                                    <>
                                                        <span className="text-gray-300">|</span>
                                                        <span className="font-bold text-gray-700">
                                                            {order.cost} {order.currency === 'POINTS' ? '积分' : '$'}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end">
                                            {/* Show modify/cancel buttons only for PRODUCT orders with 待联系 status */}
                                            {order.itemType === 'PRODUCT' && order.status === '待联系' && (
                                                <>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setEditingOrder(order);
                                                        }}
                                                        className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 flex items-center"
                                                    >
                                                        <Edit2 size={14} className="mr-1" /> 修改
                                                    </button>
                                                    <button
                                                        onClick={async (e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            if (!confirm('确定取消此订单吗？')) return;
                                                            setActionLoading(true);
                                                            try {
                                                                const res = await fetch('/api/orders', {
                                                                    method: 'DELETE',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ id: order.id })
                                                                });
                                                                if (res.ok) {
                                                                    alert('订单已取消');
                                                                    window.location.reload();
                                                                } else {
                                                                    const err = await res.json();
                                                                    alert(err.error || '取消失败');
                                                                }
                                                            } catch { alert('网络错误'); }
                                                            setActionLoading(false);
                                                        }}
                                                        disabled={actionLoading}
                                                        className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 flex items-center"
                                                    >
                                                        <X size={14} className="mr-1" /> 取消
                                                    </button>
                                                </>
                                            )}
                                            {/* Show contact edit button for non-product or non-pending orders */}
                                            {(order.itemType !== 'PRODUCT' || order.status !== '待联系') && (
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setEditingContact({
                                                            type: 'order',
                                                            id: order.id,
                                                            title: order.itemName,
                                                            contact: order.contactDetails || ''
                                                        });
                                                    }}
                                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                                                    title="修改联系方式"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            )}
                                            <Badge status={order.status} />
                                            {detailLink && <ChevronRight size={20} className="text-gray-400 group-hover:text-gray-600" />}
                                        </div>
                                    </div>
                                );
                                return detailLink ? (
                                    <Link key={order.id} href={detailLink} className="block">
                                        {content}
                                    </Link>
                                ) : (
                                    <div key={order.id}>{content}</div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Lotteries Tab */}
            {activeTab === 'lotteries' && (
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-xl text-gray-800">抽奖记录</h3>
                    </div>
                    {lotteries.length === 0 ? (
                        <div className="p-16 text-center text-gray-400 flex flex-col items-center">
                            <Gift size={48} className="mb-4 opacity-20" />
                            <p>暂无抽奖记录</p>
                            <Link href="/lottery" className="mt-4 text-pink-600 font-medium hover:underline">
                                去参与抽奖 →
                            </Link>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {lotteries.map(entry => (
                                <Link
                                    key={entry.id}
                                    href={`/lottery/${entry.lotteryId}`}
                                    className="p-6 md:p-8 hover:bg-gray-50/80 transition flex flex-col md:flex-row justify-between items-start md:items-center group block"
                                >
                                    <div className="mb-4 md:mb-0">
                                        <div className="flex items-center mb-2">
                                            <h4 className="font-bold text-lg text-gray-900 mr-3 group-hover:text-pink-600 transition-colors">
                                                {entry.lottery?.title || '未知抽奖'}
                                            </h4>
                                            {entry.isWinner && (
                                                <span className="text-xs font-bold bg-amber-100 text-amber-600 px-2 py-1 rounded flex items-center">
                                                    <Trophy size={12} className="mr-1" /> 中奖
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-gray-500 flex items-center space-x-4">
                                            <span className="flex items-center"><Clock size={14} className="mr-1.5" /> 参与: {entry.enteredAt?.split('T')[0]}</span>
                                            <span className="text-gray-300">|</span>
                                            <span className="flex items-center">
                                                <Coins size={14} className="mr-1.5" /> -{entry.lottery?.entryCost} 积分
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end">
                                        <Badge status={entry.lottery?.status || '未知'} />
                                        <ChevronRight size={20} className="text-gray-400 group-hover:text-gray-600" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Groups Tab */}
            {activeTab === 'groups' && (
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-xl text-gray-800">拼团记录</h3>
                    </div>
                    {groups.length === 0 ? (
                        <div className="p-16 text-center text-gray-400 flex flex-col items-center">
                            <Users size={48} className="mb-4 opacity-20" />
                            <p>暂无拼团记录</p>
                            <Link href="/groups" className="mt-4 text-indigo-600 font-medium hover:underline">
                                去参与拼团 →
                            </Link>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {groups.map(entry => {
                                const availableSlots = (entry.group?.targetCount ?? 0) - (entry.group?.currentCount ?? 0) + entry.quantity;
                                const isActive = entry.group?.status === '进行中';

                                return (
                                    <div
                                        key={entry.participationId}
                                        className="p-6 md:p-8 hover:bg-gray-50/80 transition"
                                    >
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                                            <Link href={`/groups/${entry.groupId}`} className="mb-4 md:mb-0 flex-1 group cursor-pointer">
                                                <div className="flex items-center mb-2">
                                                    <h4 className="font-bold text-lg text-gray-900 mr-3 group-hover:text-indigo-600 transition-colors">
                                                        {entry.group?.title || '未知拼团'}
                                                    </h4>
                                                    <Badge status={entry.group?.status || '未知'} />
                                                </div>
                                                <div className="text-sm text-gray-500 flex items-center space-x-4">
                                                    <span className="flex items-center"><Clock size={14} className="mr-1.5" /> 加入: {entry.joinedAt?.split('T')[0]}</span>
                                                    <span className="text-gray-300">|</span>
                                                    <span className="font-bold text-gray-700">
                                                        ¥{entry.group?.price} × {entry.quantity} 份
                                                    </span>
                                                    <span className="text-gray-300">|</span>
                                                    <span>进度: {entry.group?.currentCount}/{entry.group?.targetCount}</span>
                                                </div>
                                            </Link>
                                            <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
                                                {/* 只有已结束才不能修改，进行中和已锁单都可以修改 */}
                                                {entry.group?.status !== '已结束' && (
                                                    <>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingGroup(entry);
                                                            }}
                                                            disabled={actionLoading}
                                                            className={`px-3 py-1.5 text-sm rounded flex items-center ${entry.group?.status === '已锁单'
                                                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                                                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                                                                }`}
                                                        >
                                                            <Edit2 size={14} className="mr-1" /> 修改信息
                                                        </button>
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                if (!confirm('确定取消参与此拼团？您的名额将被释放。')) return;
                                                                setActionLoading(true);
                                                                try {
                                                                    const res = await fetch('/api/user/groups', {
                                                                        method: 'DELETE',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ groupId: entry.groupId })
                                                                    });
                                                                    if (res.ok) {
                                                                        alert('已取消参与');
                                                                        window.location.reload();
                                                                    } else {
                                                                        const err = await res.json();
                                                                        alert(err.error || '取消失败');
                                                                    }
                                                                } catch { alert('网络错误'); }
                                                                setActionLoading(false);
                                                            }}
                                                            disabled={actionLoading}
                                                            className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 flex items-center"
                                                        >
                                                            <X size={14} className="mr-1" /> 取消参与
                                                        </button>
                                                    </>
                                                )}
                                                {entry.group?.status === '已结束' && (
                                                    <span className="text-sm text-gray-400">团已结束，无法修改</span>
                                                )}
                                                <ChevronRight size={20} className="text-gray-400" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Modify Group Participation Modal */}
            {editingGroup && editingGroup.group && (
                <ModifyParticipationModal
                    isOpen={!!editingGroup}
                    onClose={() => setEditingGroup(null)}
                    groupId={editingGroup.groupId}
                    groupTitle={editingGroup.group.title}
                    groupPrice={editingGroup.group.price}
                    targetCount={editingGroup.group.targetCount}
                    currentCount={editingGroup.group.currentCount}
                    userQuantity={editingGroup.quantity}
                    userContactInfo={editingGroup.contactInfo}
                    onSuccess={() => window.location.reload()}
                    isNewParticipation={false}
                />
            )}

            {/* Contact Edit Modal for Orders/Lottery */}
            {editingContact && (
                <ContactEditModal
                    isOpen={!!editingContact}
                    onClose={() => setEditingContact(null)}
                    recordType={editingContact.type}
                    recordId={editingContact.id}
                    recordTitle={editingContact.title}
                    currentContact={editingContact.contact}
                    onSuccess={() => window.location.reload()}
                />
            )}

            {/* Modify Order Modal for Product Orders */}
            {editingOrder && (
                <ModifyOrderModal
                    isOpen={!!editingOrder}
                    onClose={() => setEditingOrder(null)}
                    orderId={editingOrder.id}
                    orderTitle={editingOrder.itemName}
                    unitPrice={(editingOrder.cost || 0) / (editingOrder.quantity || 1)}
                    currentQuantity={editingOrder.quantity || 1}
                    currentContact={editingOrder.contactDetails || ''}
                    onSuccess={() => window.location.reload()}
                />
            )}
        </div>
    );
}
