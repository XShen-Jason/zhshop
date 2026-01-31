'use client';

import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
    Plus, Edit, Trash2, ChevronDown, ChevronUp, Search, User, Package, List, Settings, Image as ImageIcon, Bell, Menu, X, Check, Lock, Unlock, Archive, LogOut, Download, MessageSquare, CheckCircle, XCircle, ArrowLeft, Users, Clock,
    BarChart2, ShoppingCart, Activity, AlertCircle, Box, FileText, Gift, Users2, Play, Eye, Repeat, Copy, Grid
} from 'lucide-react';
import { Order, Product, Tutorial } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { formatBeijing, utcToBeijingInputString } from '@/lib/timezone';
import { useRealtimeSubscription } from '@/lib/useRealtimeSubscription';
import MarkdownEditor from '@/components/MarkdownEditor';
import { useUI } from '@/lib/UIContext';


// Define Types locally if not in @/types perfectly yet
interface GroupBuy {
    id: string;
    title: string;
    targetCount: number;
    currentCount: number;
    status: string;
    price: number;
    description: string;
    features: string[];
    autoRenew?: boolean;
}

interface Lottery {
    id: string;
    title: string;
    drawDate: string;
    winnersCount: number;
    entryCost: number;
    status: string;
    participants: number;
    description: string;
    prizes: string[];
    minParticipants?: number;
}

// Simple Participant Interface for Modal
interface Participant {
    id: string; // entry id or user id
    userId: string;
    name?: string; // user name
    contact?: string; // if available
    isWinner?: boolean;
    joinedAt?: string;
    quantity: number;
    users?: { name: string; email?: string } | null;
    savedContacts?: { type: string; value: string }[];
}

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'products' | 'groups' | 'lotteries' | 'tutorials'>('overview');

    // Data State
    const [orders, setOrders] = useState<Order[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [groups, setGroups] = useState<GroupBuy[]>([]);
    const [lotteries, setLotteries] = useState<Lottery[]>([]);
    const [tutorials, setTutorials] = useState<Tutorial[]>([]);
    const [loading, setLoading] = useState(true);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // Modal States
    const [showProductModal, setShowProductModal] = useState(false);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [showLotteryModal, setShowLotteryModal] = useState(false);
    const [showTutorialModal, setShowTutorialModal] = useState(false);
    const [showParticipantsModal, setShowParticipantsModal] = useState(false);

    // Edit States
    const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
    const [editingGroup, setEditingGroup] = useState<Partial<GroupBuy> | null>(null);
    const [editingLottery, setEditingLottery] = useState<Partial<Lottery> | null>(null);
    const [editingTutorial, setEditingTutorial] = useState<Partial<Tutorial> | null>(null);

    // Participant View State
    const [currentViewType, setCurrentViewType] = useState<'GROUP' | 'LOTTERY' | null>(null);
    const [currentViewId, setCurrentViewId] = useState<string>('');
    const [participantsList, setParticipantsList] = useState<Participant[]>([]);
    const [participantsLoading, setParticipantsLoading] = useState(false);

    const [actionLoading, setActionLoading] = useState(false);

    const router = useRouter();
    const supabase = createClient();
    const { showToast, showConfirm, showPrompt } = useUI();

    // Separate fetch functions for each data type
    const fetchOrders = async (silent = false) => {
        try {
            const res = await fetch('/api/orders');
            if (res.ok) setOrders(await res.json());
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    };

    const fetchProducts = async (silent = false) => {
        try {
            const res = await fetch('/api/products');
            if (res.ok) setProducts(await res.json());
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const fetchGroups = async (silent = false) => {
        try {
            const res = await fetch('/api/groups');
            if (res.ok) setGroups(await res.json());
        } catch (error) {
            console.error('Error fetching groups:', error);
        }
    };

    const fetchLotteries = async (silent = false) => {
        try {
            // Trigger auto-draw check before fetching lottery list
            // This ensures any lotteries past draw date are automatically processed
            try {
                await fetch('/api/lottery/auto-draw', { method: 'POST' });
            } catch (e) {
                console.error('Auto-draw check failed:', e);
            }

            const res = await fetch('/api/lottery');
            if (res.ok) setLotteries(await res.json());
        } catch (error) {
            console.error('Error fetching lotteries:', error);
        }
    };

    const fetchTutorials = async (silent = false) => {
        try {
            const res = await fetch('/api/tutorials');
            if (res.ok) setTutorials(await res.json());
        } catch (error) {
            console.error('Error fetching tutorials:', error);
        }
    };

    // Fetch all data (for initial load and overview)
    const fetchAllData = async () => {
        await Promise.all([
            fetchOrders(true),
            fetchProducts(true),
            fetchGroups(true),
            fetchLotteries(true),
            fetchTutorials(true)
        ]);
    };

    // Init - load all data for overview statistics
    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/auth/login'); return; }
            const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
            if (profile?.role !== 'ADMIN') { router.push('/'); return; }

            setLoading(true);
            await fetchAllData();
            setLoading(false);
            setIsInitialLoad(false);
        }
        init();
    }, [router]);

    // Tab switch - refresh only the relevant data (silent refresh)
    useEffect(() => {
        if (isInitialLoad) return; // Skip during initial load

        switch (activeTab) {
            case 'orders': fetchOrders(true); break;
            case 'products': fetchProducts(true); break;
            case 'groups': fetchGroups(true); break;
            case 'lotteries': fetchLotteries(true); break;
            case 'tutorials': fetchTutorials(true); break;
            // 'overview' uses existing data, no need to refetch
        }
    }, [activeTab, isInitialLoad]);

    // Realtime subscriptions - split by table to only refresh affected data
    useRealtimeSubscription(
        [{ table: 'orders' }],
        () => fetchOrders(true)
    );

    useRealtimeSubscription(
        [{ table: 'products' }],
        () => fetchProducts(true)
    );

    useRealtimeSubscription(
        [{ table: 'group_buys' }, { table: 'group_participants' }],
        () => fetchGroups(true)
    );

    useRealtimeSubscription(
        [{ table: 'lotteries' }, { table: 'lottery_entries' }],
        () => fetchLotteries(true)
    );

    useRealtimeSubscription(
        [{ table: 'tutorials' }],
        () => fetchTutorials(true)
    );

    // --- Handlers ---
    const [orderFilter, setOrderFilter] = useState('全部');
    const orderStatuses = ['全部', '待联系', '已联系', '已完成', '已取消'];

    const updateOrderStatus = async (id: string, status: string) => {
        // Immediate optimistic update
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));

        // Background API call
        fetch('/api/orders', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status })
        }).catch(e => console.error(e));
    };

    const handleAction = async (url: string, data: any, id: string | undefined, onSuccess: () => void, refreshFn?: () => Promise<void>) => {
        setActionLoading(true);
        try {
            const method = id ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            if (res.ok) {
                // Close modal immediately
                onSuccess();
                // Immediately refresh only the relevant data (silent) - don't wait for Realtime
                if (refreshFn) await refreshFn();
            } else {
                showToast('操作失败', 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('发生错误', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (url: string, id: string, refreshFn?: () => Promise<void>) => {
        const confirmed = await showConfirm('确认删除', '确定删除吗？');
        if (!confirmed) return;
        try {
            await fetch(url, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
            // Immediately refresh only the relevant data (silent)
            if (refreshFn) await refreshFn();
        } catch (e) { console.error(e); }
    };

    const handleBatchRename = async (type: 'category' | 'subCategory', oldName: string, newName: string, parentCategory?: string) => {
        const confirmed = await showConfirm('批量重命名', `确定将 "${oldName}" 重命名为 "${newName}" 吗？所有相关商品都将更新。`);
        if (!confirmed) return;
        try {
            const res = await fetch('/api/categories', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldName, newName, type: 'products', scope: type, parentCategory })
            });

            if (res.ok) {
                showToast('重命名成功', 'success');
                fetchProducts(true);
            } else {
                showToast('重命名失败', 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('网络错误', 'error');
        }
    };


    // Save Handlers
    const saveProduct = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProduct) return;
        const payload = { ...editingProduct, features: typeof editingProduct.features === 'string' ? (editingProduct.features as string).split('\\n') : editingProduct.features };
        handleAction('/api/products', payload, editingProduct.id, () => { setShowProductModal(false); setEditingProduct(null); }, fetchProducts);
    };

    const saveGroup = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingGroup) return;
        const payload = { ...editingGroup, features: typeof editingGroup.features === 'string' ? (editingGroup.features as string).split('\\n') : editingGroup.features };
        handleAction('/api/groups', payload, editingGroup.id, () => { setShowGroupModal(false); setEditingGroup(null); }, fetchGroups);
    };

    const saveLottery = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingLottery) return;
        const payload = { ...editingLottery, prizes: typeof editingLottery.prizes === 'string' ? (editingLottery.prizes as string).split('\\n') : editingLottery.prizes };
        handleAction('/api/lottery', payload, editingLottery.id, () => { setShowLotteryModal(false); setEditingLottery(null); }, fetchLotteries);
    };

    const saveTutorial = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTutorial) return;
        const payload = { ...editingTutorial, tags: typeof editingTutorial.tags === 'string' ? (editingTutorial.tags as string).split(',') : editingTutorial.tags };
        handleAction('/api/tutorials', payload, editingTutorial.id, () => { setShowTutorialModal(false); setEditingTutorial(null); }, fetchTutorials);
    };

    const [showCategoryModal, setShowCategoryModal] = useState(false);

    const handleCategoryRename = async (oldName: string, newName: string) => {
        const confirmed = await showConfirm('分类重命名', `确定将 "${oldName}" 重命名为 "${newName}" 吗？所有相关商品都将更新。`);
        if (!confirmed) return;

        try {
            const res = await fetch('/api/categories', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldName, newName, type: 'products' })
            });

            if (res.ok) {
                showToast('分类重命名成功', 'success');
                fetchProducts(true);
            } else {
                showToast('重命名失败', 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('网络错误', 'error');
        }
    };

    // Specific Feature Handlers
    const updateGroupStatus = async (id: string, status: string) => {
        const confirmed = await showConfirm('更新拼团状态', '确定要更新拼团状态吗？');
        if (!confirmed) return;

        // Optimistic update
        setGroups(prev => prev.map(g => g.id === id ? { ...g, status } : g));

        try {
            await fetch('/api/groups', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status })
            });
            fetchGroups(true);
        } catch (e) {
            console.error(e);
            showToast('更新失败', 'error');
        }
    };

    const executeDraw = async (id: string) => {
        const confirmed = await showConfirm('立即开奖', '确定现在开奖吗？系统将自动随机抽取中奖者。');
        if (!confirmed) return;
        try {
            const res = await fetch('/api/lottery/draw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lotteryId: id })
            });
            if (res.ok) {
                const data = await res.json();
                showToast(`开奖成功！共有 ${data.winnersCount} 位中奖者。`, 'success');
                fetchLotteries(true);
            } else {
                const err = await res.json();
                showToast('开奖失败: ' + (err.error || '未知错误'), 'error');
            }
        } catch (e) { console.error(e); showToast('网络错误', 'error'); }
    };

    const viewParticipants = async (type: 'GROUP' | 'LOTTERY', id: string) => {
        setCurrentViewType(type);
        setCurrentViewId(id);
        setShowParticipantsModal(true);
        setParticipantsLoading(true);
        setParticipantsList([]);

        try {
            if (type === 'GROUP') {
                const res = await fetch(`/api/groups/participants?groupId=${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setParticipantsList(data);
                } else {
                    console.error('Failed to fetch participants');
                    setParticipantsList([]);
                }
            } else {
                const { data, error } = await supabase
                    .from('lottery_entries')
                    .select('user_id, entered_at, is_winner, users(email, name, contact_info, saved_contacts)')
                    .eq('lottery_id', id);
                if (error) throw error;
                const list = data.map((d: any) => ({
                    id: d.user_id,
                    userId: d.user_id,
                    name: d.users?.name || '未知用户',
                    contact: d.users?.contact_info || d.users?.email || '-',
                    joinedAt: d.entered_at,
                    isWinner: d.is_winner,
                    quantity: 1,
                    savedContacts: d.users?.saved_contacts || []
                }));
                // Sort winners to the top
                list.sort((a: any, b: any) => (b.isWinner ? 1 : 0) - (a.isWinner ? 1 : 0));
                setParticipantsList(list);
            }
        } catch (e) {
            console.error(e);
            setParticipantsList([]);
        } finally {
            setParticipantsLoading(false);
        }
    };

    const handleParticipantUpdate = async (userId: string, currentQty: number) => {
        if (!currentViewId) return;

        // Find the group to check limits
        const group = groups.find(g => g.id === currentViewId);
        let maxQtyMsg = '';
        let maxAllowed = 999;

        if (group && currentViewType === 'GROUP') {
            // Remaining slots = target - current
            // But we are editing an EXISTING participation, so we reclaim 'currentQty' slots first
            const remaining = (group.targetCount || 0) - (group.currentCount || 0);
            maxAllowed = remaining + currentQty;
            maxQtyMsg = ` (当前库存允许最大: ${maxAllowed})`;
        }

        const newQtyStr = await showPrompt(`修改数量${maxQtyMsg}`, '请输入新的数量:', currentQty.toString());
        if (newQtyStr === null) return;
        const newQty = parseInt(newQtyStr);
        if (isNaN(newQty) || newQty < 1) return showToast('请输入有效数量', 'error');

        if (newQty > maxAllowed) {
            return showToast(`修改失败：数量不能超过 ${maxAllowed}`, 'error');
        }

        try {
            const res = await fetch('/api/groups/participants', {
                method: 'PUT',
                body: JSON.stringify({ groupId: currentViewId, userId, quantity: newQty })
            });
            if (res.ok) {
                showToast('修改成功', 'success');
                viewParticipants('GROUP', currentViewId);
                fetchGroups(true);
            } else {
                showToast('修改失败', 'error');
            }
        } catch (e) { console.error(e); showToast('网络错误', 'error'); }
    };

    const handleParticipantDelete = async (userId: string) => {
        const confirmed = await showConfirm('移除成员', '确定要移除该成员吗？');
        if (!currentViewId || !confirmed) return;
        try {
            const res = await fetch('/api/groups/participants', {
                method: 'DELETE',
                body: JSON.stringify({ groupId: currentViewId, userId })
            });
            if (res.ok) {
                showToast('移除成功', 'success');
                viewParticipants('GROUP', currentViewId);
                fetchGroups(true);
            } else {
                showToast('移除失败', 'error');
            }
        } catch (e) { console.error(e); showToast('网络错误', 'error'); }
    };

    // --- Renderers ---
    const renderOverview = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500">待处理订单</p>
                    <h3 className="text-2xl font-bold text-amber-600">{orders.filter(o => o.status === '待联系').length}</h3>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500">商品总数</p>
                    <h3 className="text-2xl font-bold text-blue-600">{products.length}</h3>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500">进行中拼团</p>
                    <h3 className="text-2xl font-bold text-purple-600">{groups.filter(g => g.status === '进行中').length}</h3>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500">待开奖活动</p>
                    <h3 className="text-2xl font-bold text-pink-600">{lotteries.filter(l => l.status === '待开奖').length}</h3>
                </div>
            </div>
        </div>
    );

    const [showCancelledOrders, setShowCancelledOrders] = useState(false);

    // Independent Filters for each column: { category: string, subCategory: string }
    const [pendingFilter, setPendingFilter] = useState({ category: '全部', subCategory: '全部' });
    const [contactedFilter, setContactedFilter] = useState({ category: '全部', subCategory: '全部' });
    const [completedFilter, setCompletedFilter] = useState({ category: '全部', subCategory: '全部' });

    const renderOrders = () => {
        // 1. Filter by Cancelled View
        if (showCancelledOrders) {
            const cancelledOrders = orders.filter(o => o.status === '已取消');
            const OrderCard = ({ order }: { order: Order }) => (
                <div className="bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-all text-sm group relative">
                    <div className="flex justify-between items-start mb-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${order.itemType === 'PRODUCT' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                            {order.itemType === 'PRODUCT' ? '商品' : order.itemType === 'GROUP' ? '拼团' : '抽奖'}
                        </span>
                        <span className="text-gray-400 text-[10px]">{new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="font-bold text-gray-800 mb-1 line-clamp-2">{order.itemName}</div>
                    <div className="bg-gray-50 p-2 rounded mb-2 text-xs text-gray-600 break-all">
                        {order.contactDetails}
                    </div>
                    {order.savedContacts && order.savedContacts.length > 0 && (
                        <details className="mb-2 group/contacts">
                            <summary className="text-[10px] text-indigo-600 cursor-pointer list-none flex items-center gap-1 opacity-80 hover:opacity-100">
                                <span>备用联系方式 ({order.savedContacts.length})</span>
                                <span className="group-open/contacts:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="mt-1 space-y-1 pl-2 border-l-2 border-indigo-100 bg-indigo-50/30 p-1.5 rounded-r">
                                {order.savedContacts.map((c: any, i: number) => (
                                    <div key={i} className="text-[10px] text-gray-600 font-mono flex gap-1">
                                        <span className="font-bold text-indigo-500 shrink-0">{c.label || c.type}:</span>
                                        <span className="break-all">{c.value}</span>
                                    </div>
                                ))}
                            </div>
                        </details>
                    )}
                    <div className="flex gap-1 mt-2 border-t pt-2">
                        <button onClick={() => updateOrderStatus(order.id, '待联系')} className="flex-1 bg-gray-100 text-gray-600 py-1 rounded hover:bg-gray-200">
                            恢复订单
                        </button>
                    </div>
                </div>
            );

            return (
                <div className="space-y-4 h-full flex flex-col">
                    <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex-shrink-0">
                        <h3 className="text-lg font-bold flex items-center text-red-600"><XCircle className="mr-2" />已取消订单 ({cancelledOrders.length})</h3>
                        <button onClick={() => setShowCancelledOrders(false)} className="text-sm px-3 py-1.5 rounded-full bg-gray-800 text-white flex items-center gap-1 hover:bg-gray-700">
                            <ArrowLeft size={14} /> 返回看板
                        </button>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-y-auto">
                        {cancelledOrders.map(o => <OrderCard key={o.id} order={o} />)}
                        {cancelledOrders.length === 0 && <div className="col-span-full text-center text-gray-400 py-10">无取消订单</div>}
                    </div>
                </div>
            )
        }

        // Helper to filter a list by its specific filter state
        const filterList = (list: Order[], filterState: { category: string, subCategory: string }) => {
            let result = list;
            if (filterState.category !== '全部') {
                result = result.filter(o => {
                    if (o.itemType !== 'PRODUCT') return false;
                    const product = products.find(p => p.id === o.itemId);
                    return product?.category === filterState.category;
                });
            }
            if (filterState.subCategory !== '全部') {
                result = result.filter(o => {
                    const product = products.find(p => p.id === o.itemId);
                    return product?.subCategory === filterState.subCategory;
                });
            }
            return result;
        };

        const pendingOrders = filterList(orders.filter(o => o.status === '待联系'), pendingFilter);
        const contactedOrders = filterList(orders.filter(o => o.status === '已联系'), contactedFilter);
        const completedOrders = filterList(orders.filter(o => o.status === '已完成'), completedFilter);

        const OrderCard = ({ order }: { order: Order }) => (
            <div className="bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-all text-sm group relative">
                <div className="flex justify-between items-start mb-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${order.itemType === 'PRODUCT' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                        {order.itemType === 'PRODUCT' ? '商品' : order.itemType === 'GROUP' ? '拼团' : '抽奖'}
                    </span>
                    <span className="text-gray-400 text-[10px]">{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="font-bold text-gray-800 mb-1 line-clamp-2">{order.itemName}</div>
                {order.itemType === 'PRODUCT' && (
                    <div className="text-[10px] text-gray-500 mb-2">
                        {(() => {
                            const p = products.find(prod => prod.id === order.itemId);
                            return p ? `${p.category} ${p.subCategory ? `/ ${p.subCategory}` : ''}` : '';
                        })()}
                    </div>
                )}
                <div className="bg-gray-50 p-2 rounded mb-2 text-xs text-gray-600 break-all">
                    {order.contactDetails}
                </div>
                {/* Backup Contacts */}
                {order.savedContacts && order.savedContacts.length > 0 && (
                    <details className="mb-2 group/contacts">
                        <summary className="text-[10px] text-indigo-600 cursor-pointer list-none flex items-center gap-1 opacity-80 hover:opacity-100">
                            <span>备用联系方式 ({order.savedContacts.length})</span>
                            <span className="group-open/contacts:rotate-180 transition-transform">▼</span>
                        </summary>
                        <div className="mt-1 space-y-1 pl-2 border-l-2 border-indigo-100 bg-indigo-50/30 p-1.5 rounded-r">
                            {order.savedContacts.map((c: any, i: number) => (
                                <div key={i} className="text-[10px] text-gray-600 font-mono flex gap-1">
                                    <span className="font-bold text-indigo-500 shrink-0">{c.label || c.type}:</span>
                                    <span className="break-all">{c.value}</span>
                                </div>
                            ))}
                        </div>
                    </details>
                )}

                {order.quantity && order.quantity > 1 && <div className="text-xs font-bold text-amber-600 mb-2">数量: {order.quantity}</div>}

                {/* Actions */}
                <div className="flex gap-1 mt-2 border-t pt-2">
                    {order.status !== '已取消' && (
                        <>
                            {/* Forward Action */}
                            {order.status === '待联系' && (
                                <button onClick={() => updateOrderStatus(order.id, '已联系')} className="flex-1 bg-blue-50 text-blue-600 py-1 rounded hover:bg-blue-100 flex items-center justify-center gap-1">
                                    <MessageSquare size={12} /> 联系
                                </button>
                            )}
                            {order.status === '已联系' && (
                                <button onClick={() => updateOrderStatus(order.id, '已完成')} className="flex-1 bg-green-50 text-green-600 py-1 rounded hover:bg-green-100 flex items-center justify-center gap-1">
                                    <CheckCircle size={12} /> 完成
                                </button>
                            )}
                            {/* Cancel Action */}
                            {order.status !== '已完成' && (
                                <button onClick={() => updateOrderStatus(order.id, '已取消')} className="px-2 text-gray-400 hover:text-red-500" title="取消订单">
                                    <XCircle size={14} />
                                </button>
                            )}
                            {/* Backward Action for Completed */}
                            {order.status === '已完成' && (
                                <span className="w-full text-center text-green-600 text-xs py-1">✓ 交易完成</span>
                            )}
                        </>
                    )}
                </div>
            </div>
        );

        return (
            <div className="space-y-4 h-full flex flex-col">
                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex-shrink-0">
                    <h3 className="text-lg font-bold flex items-center">订单管理 (看板)</h3>
                    <button onClick={() => setShowCancelledOrders(true)} className="text-sm px-3 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center gap-1">
                        <Trash2 size={14} /> 查看已取消
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">
                    {/* Column Renderer Helper */}
                    {[
                        { title: '待联系', icon: Clock, color: 'blue', list: pendingOrders, filter: pendingFilter, setFilter: setPendingFilter },
                        { title: '已联系', icon: MessageSquare, color: 'purple', list: contactedOrders, filter: contactedFilter, setFilter: setContactedFilter },
                        { title: '已完成', icon: CheckCircle, color: 'green', list: completedOrders, filter: completedFilter, setFilter: setCompletedFilter }
                    ].map((col, idx) => (
                        <div key={idx} className={`flex flex-col bg-${col.color}-50/50 rounded-xl border border-${col.color}-100 h-full overflow-hidden`}>
                            <div className={`p-3 bg-${col.color}-100/50 border-b border-${col.color}-100 space-y-2`}>
                                <div className="flex justify-between items-center">
                                    <span className={`font-bold text-${col.color}-800 flex items-center`}><col.icon size={16} className="mr-2" /> {col.title}</span>
                                    <span className={`bg-white text-${col.color}-600 text-xs px-2 py-0.5 rounded-full shadow-sm font-bold`}>{col.list.length}</span>
                                </div>
                                {/* Column Specific Filter */}
                                <div className="flex gap-1">
                                    <select
                                        value={col.filter.category}
                                        onChange={e => col.setFilter({ category: e.target.value, subCategory: '全部' })}
                                        className="text-[10px] w-full border-gray-200 rounded shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-1"
                                    >
                                        <option value="全部">全部分类</option>
                                        {categoryStructure.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                    </select>
                                    {col.filter.category !== '全部' && (
                                        <select
                                            value={col.filter.subCategory}
                                            onChange={e => col.setFilter({ ...col.filter, subCategory: e.target.value })}
                                            className="text-[10px] w-full border-gray-200 rounded shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-1 animate-fade-in"
                                        >
                                            <option value="全部">全部子类</option>
                                            {categoryStructure.find(c => c.name === col.filter.category)?.subCategories.map(sub => (
                                                <option key={sub} value={sub}>{sub}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>
                            <div className={`p-3 overflow-y-auto space-y-3 flex-1 scrollbar-thin scrollbar-thumb-${col.color}-200`}>
                                {col.list.map(o => <OrderCard key={o.id} order={o} />)}
                                {col.list.length === 0 && <div className={`text-center text-${col.color}-300 py-8 text-sm`}>无相关订单</div>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderGroupSection = (title: string, items: GroupBuy[], icon: React.ReactNode, type: 'ACTIVE' | 'LOCKED' | 'ENDED') => (
        <div className="space-y-3">
            <h4 className="font-bold text-gray-600 flex items-center">{icon} <span className="ml-2">{title}</span> <span className="ml-2 text-xs bg-gray-200 px-2 rounded-full">{items.length}</span></h4>
            {items.length === 0 ? (
                <div className="p-4 bg-white rounded border border-dashed text-gray-400 text-sm text-center">暂无此类拼团</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map(g => (
                        <div key={g.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-2">
                                <h5 className="font-bold text-gray-800 line-clamp-1" title={g.title}>{g.title}</h5>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${g.status === '进行中' ? 'bg-green-100 text-green-800' :
                                    g.status === '已锁单' ? 'bg-amber-100 text-amber-800' :
                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                    {g.status}
                                </span>
                            </div>
                            <div className="text-2xl font-bold text-indigo-600 mb-2">¥{g.price}</div>
                            <div className="flex justify-between items-end mb-3">
                                <div className="text-sm text-gray-600">
                                    进度: <span className="font-bold text-gray-900">{g.currentCount}</span>/{g.targetCount}
                                </div>
                                {g.autoRenew && (
                                    <div className="text-xs flex items-center text-blue-600 bg-blue-50 px-2 py-0.5 rounded" title="满员后自动开启下一团">
                                        <Repeat size={12} className="mr-1" /> 自动续团
                                    </div>
                                )}
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4">
                                <div className={`h-1.5 rounded-full ${g.currentCount >= g.targetCount ? 'bg-green-500' : 'bg-indigo-600'}`} style={{ width: `${Math.min(100, (g.currentCount / g.targetCount) * 100)}%` }}></div>
                            </div>

                            <div className="flex border-t pt-3 gap-2">
                                <button onClick={() => viewParticipants('GROUP', g.id)} className="flex-1 py-1.5 text-xs bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 flex items-center justify-center">
                                    <Users size={14} className="mr-1" /> 名单
                                </button>

                                {type !== 'ENDED' && (
                                    <button onClick={() => { setEditingGroup({ ...g, features: g.features.join('\\n') } as any); setShowGroupModal(true) }} className="flex-1 py-1.5 text-xs bg-gray-50 text-gray-700 rounded hover:bg-gray-100 flex items-center justify-center">
                                        <Edit size={14} className="mr-1" /> 编辑
                                    </button>
                                )}

                                {/* Quick Actions */}
                                {type === 'LOCKED' && (
                                    <button
                                        onClick={() => updateGroupStatus(g.id, '已结束')}
                                        className="flex-1 py-1.5 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 flex items-center justify-center font-bold"
                                        title="结束拼团"
                                    >
                                        <Check size={14} className="mr-1" /> 结束
                                    </button>
                                )}

                                <button onClick={() => handleDelete('/api/groups', g.id, fetchGroups)} className="w-8 flex items-center justify-center text-red-400 hover:text-red-600 rounded hover:bg-red-50">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderGroups = () => {
        const activeGroups = groups.filter(g => g.status === '进行中');
        const lockedGroups = groups.filter(g => g.status === '已锁单'); // Use '已锁单' as Locked
        const endedGroups = groups.filter(g => g.status === '已结束');

        const GroupCard = ({ group }: { group: GroupBuy }) => (
            <div key={group.id} className="bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow relative group">
                <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-800 line-clamp-1">{group.title}</h4>
                    <button onClick={() => { setEditingGroup(group); setShowGroupModal(true); }} className="text-gray-400 hover:text-indigo-600"><Edit size={14} /></button>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                    <span>¥{group.price}</span>
                    <span className={`${group.currentCount >= group.targetCount ? 'text-red-500' : 'text-green-500'}`}>
                        {group.currentCount}/{group.targetCount}
                    </span>
                </div>
                <div className="flex justify-between gap-1 mt-2">
                    {group.status === '进行中' && (
                        <button onClick={() => updateGroupStatus(group.id, '已锁单')} className="flex-1 bg-yellow-50 text-yellow-600 py-1 rounded text-xs hover:bg-yellow-100">
                            锁单
                        </button>
                    )}
                    {group.status === '已锁单' && (
                        <>
                            <button onClick={() => updateGroupStatus(group.id, '进行中')} className="flex-1 bg-green-50 text-green-600 py-1 rounded text-xs hover:bg-green-100">
                                恢复
                            </button>
                            <button onClick={() => updateGroupStatus(group.id, '已结束')} className="flex-1 bg-gray-100 text-gray-600 py-1 rounded text-xs hover:bg-gray-200">
                                结束
                            </button>
                        </>
                    )}
                    <button onClick={() => handleDelete('/api/groups', group.id, fetchGroups)} className="px-2 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
                <button onClick={() => viewParticipants('GROUP', group.id)} className="w-full mt-2 text-xs text-center text-indigo-500 bg-indigo-50 py-1 rounded hover:bg-indigo-100">
                    查看成员 ({group.currentCount})
                </button>
            </div>
        );

        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold">拼团管理</h3>
                    <button onClick={() => { setEditingGroup({}); setShowGroupModal(true) }} className="bg-green-600 text-white px-3 py-1.5 rounded text-sm flex items-center hover:bg-green-700 transition-colors"><Plus size={16} className="mr-1" />新增拼团</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Active */}
                    <div className="bg-gray-50 rounded-xl p-4 min-h-[500px]">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-green-700 flex items-center"><Users size={18} className="mr-2" />进行中</h4>
                            <span className="bg-green-200 text-green-800 text-xs px-2 py-0.5 rounded-full">{activeGroups.length}</span>
                        </div>
                        <div className="space-y-3">
                            {activeGroups.map(g => <GroupCard key={g.id} group={g} />)}
                        </div>
                    </div>

                    {/* Locked */}
                    <div className="bg-gray-50 rounded-xl p-4 min-h-[500px]">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-amber-700 flex items-center"><Lock size={18} className="mr-2" />已锁单</h4>
                            <span className="bg-amber-200 text-amber-800 text-xs px-2 py-0.5 rounded-full">{lockedGroups.length}</span>
                        </div>
                        <div className="space-y-3">
                            {lockedGroups.map(g => <GroupCard key={g.id} group={g} />)}
                        </div>
                    </div>

                    {/* History */}
                    <div className="bg-gray-50 rounded-xl p-4 min-h-[500px]">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-gray-600 flex items-center"><Clock size={18} className="mr-2" />历史拼团</h4>
                            <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">{endedGroups.length}</span>
                        </div>
                        <div className="space-y-3">
                            {endedGroups.map(g => <GroupCard key={g.id} group={g} />)}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderLotteries = () => {
        const pendingLotteries = lotteries.filter(l => l.status === '待开奖');
        const endedLotteries = lotteries.filter(l => l.status !== '待开奖').sort((a, b) => new Date(b.drawDate).getTime() - new Date(a.drawDate).getTime());

        const renderLotteryTable = (items: Lottery[], isPending: boolean) => (
            <div className="bg-white rounded shadow text-sm overflow-hidden border border-gray-200">
                <table className="w-full text-left">
                    <thead className="bg-gray-50"><tr><th className="p-3">标题</th><th className="p-3">日期</th><th className="p-3">人数</th><th className="p-3">操作</th></tr></thead>
                    <tbody className="divide-y">
                        {items.length === 0 ? (
                            <tr><td colSpan={4} className="p-4 text-center text-gray-400">暂无数据</td></tr>
                        ) : (
                            items.map(l => (
                                <tr key={l.id} className={isPending ? 'bg-amber-50/30' : ''}>
                                    <td className="p-3">
                                        <div className="font-medium line-clamp-1" title={l.title}>{l.title}</div>
                                        <div className="text-xs text-gray-400 mt-0.5">
                                            {isPending ? (
                                                <span className="text-amber-600 bg-amber-50 px-1 rounded">待开奖</span>
                                            ) : (
                                                <span className="bg-gray-100 px-1 rounded">{l.status}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-3 text-xs">
                                        {formatBeijing(l.drawDate, 'MM-dd')}
                                        <span className="text-gray-400 block">{formatBeijing(l.drawDate, 'HH:mm')}</span>
                                    </td>
                                    <td className="p-3">
                                        {l.participants}
                                        <button onClick={() => viewParticipants('LOTTERY', l.id)} className="ml-1 text-xs text-indigo-600 hover:underline">名单</button>
                                    </td>
                                    <td className="p-3 flex gap-1">
                                        {isPending && (
                                            <button onClick={() => executeDraw(l.id)} className="text-purple-600 hover:bg-purple-50 p-1 rounded" title="立即开奖"><Play size={14} /></button>
                                        )}
                                        <button onClick={() => { setEditingLottery({ ...l, drawDate: utcToBeijingInputString(l.drawDate), prizes: l.prizes.join('\n') } as any); setShowLotteryModal(true) }} className="text-blue-600 hover:bg-blue-50 p-1 rounded" title="编辑"><Edit size={14} /></button>
                                        <button onClick={() => handleDelete('/api/lottery', l.id, fetchLotteries)} className="text-red-600 hover:bg-red-50 p-1 rounded" title="删除"><Trash2 size={14} /></button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        );

        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold">抽奖管理</h3>
                    <button onClick={() => { setEditingLottery({}); setShowLotteryModal(true) }} className="bg-indigo-600 text-white px-3 py-1.5 rounded flex items-center text-sm"><Plus size={16} className="mr-1" /> 发布抽奖</button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <h4 className="font-bold text-amber-600 flex items-center"><Clock size={16} className="mr-2" /> 待开奖 ({pendingLotteries.length})</h4>
                        {renderLotteryTable(pendingLotteries, true)}
                    </div>
                    <div className="space-y-2">
                        <h4 className="font-bold text-gray-600 flex items-center"><Archive size={16} className="mr-2" /> 历史记录 ({endedLotteries.length})</h4>
                        {renderLotteryTable(endedLotteries, false)}
                    </div>
                </div>
            </div>
        );
    };

    // Products and Tutorials Renderers
    const [productFilter, setProductFilter] = useState('全部');
    const [productSubFilter, setProductSubFilter] = useState('全部');

    // Derive category structure
    const categoryStructure = React.useMemo(() => {
        const structure: Record<string, Set<string>> = {};
        products.forEach(p => {
            if (!structure[p.category]) structure[p.category] = new Set();
            if (p.subCategory) structure[p.category].add(p.subCategory);
        });
        return Object.entries(structure).map(([name, subs]) => ({
            name,
            subCategories: Array.from(subs)
        }));
    }, [products]);

    const filteredProducts = products.filter(p => {
        if (productFilter !== '全部' && p.category !== productFilter) return false;
        if (productSubFilter !== '全部' && p.subCategory !== productSubFilter) return false;
        return true;
    });

    const renderProducts = () => (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">商品管理</h3>
                <button onClick={() => { setEditingProduct({}); setShowProductModal(true) }} className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm flex items-center hover:bg-indigo-700 transition-colors"><Plus size={16} className="mr-1" />新增</button>
            </div>

            {/* Enhanced Category Filter */}
            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500">一级分类:</span>
                    <select
                        value={productFilter}
                        onChange={e => { setProductFilter(e.target.value); setProductSubFilter('全部'); }}
                        className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-1"
                    >
                        <option value="全部">全部</option>
                        {categoryStructure.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                </div>

                {productFilter !== '全部' && (
                    <div className="flex items-center gap-2 animate-fade-in">
                        <span className="text-xs font-bold text-gray-500">二级分类:</span>
                        <select
                            value={productSubFilter}
                            onChange={e => setProductSubFilter(e.target.value)}
                            className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-1"
                        >
                            <option value="全部">全部子类</option>
                            {categoryStructure.find(c => c.name === productFilter)?.subCategories.map(sub => (
                                <option key={sub} value={sub}>{sub}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-gray-400">共 {filteredProducts.length} 个商品</span>
                    <button
                        onClick={() => setShowCategoryModal(true)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full flex items-center transition-colors"
                    >
                        <List size={14} className="mr-1" /> 分类管理
                    </button>
                </div>
            </div>

            {/* Category Management Modal - Enhanced */}
            {showCategoryModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[80vh] overflow-hidden flex flex-col">
                        <h3 className="text-lg font-bold mb-4 flex items-center"><List size={20} className="mr-2 text-indigo-600" />分类管理</h3>
                        <p className="text-xs text-gray-500 mb-4 bg-yellow-50 p-2 rounded border border-yellow-100">
                            注意：修改分类名称会将所有属于该分类的商品同步更新。
                        </p>
                        <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                            {categoryStructure.filter(c => c.name !== '全部').map(cat => (
                                <div key={cat.name} className="border border-gray-100 rounded-lg overflow-hidden">
                                    <div className="flex items-center justify-between p-3 bg-gray-50 group">
                                        <span className="text-sm font-bold text-gray-800">{cat.name}</span>
                                        <button
                                            onClick={async () => {
                                                const newName = await showPrompt('重命名一级分类', '请输入新的分类名称:', cat.name);
                                                if (newName && newName !== cat.name) handleBatchRename('category', cat.name, newName);
                                            }}
                                            className="text-gray-400 hover:text-indigo-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="重命名一级分类"
                                        >
                                            <Edit size={14} />
                                        </button>
                                    </div>
                                    <div className="p-3 bg-white">
                                        {cat.subCategories.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {cat.subCategories.map(sub => (
                                                    <div key={sub} className="flex items-center bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs group/sub">
                                                        {sub}
                                                        <button
                                                            onClick={async () => {
                                                                const newName = await showPrompt('重命名二级分类', '请输入新的分类名称:', sub);
                                                                if (newName && newName !== sub) handleBatchRename('subCategory', sub, newName, cat.name);
                                                            }}
                                                            className="ml-2 text-blue-400 hover:text-blue-700"
                                                            title="重命名二级分类"
                                                        >
                                                            <Edit size={10} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">无二级分类</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 flex justify-end pt-4 border-t">
                            <button onClick={() => setShowCategoryModal(false)} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors">关闭</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map(p => (
                    <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-2">
                            <h5 className="font-bold text-gray-800 line-clamp-1" title={p.title}>{p.title}</h5>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${p.inStock ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                {p.inStock ? '上架' : '下架'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xl font-bold text-indigo-600">¥{p.price}</span>
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full flex items-center">{p.category} {p.subCategory && <span className="text-blue-400 mx-1">/</span>} {p.subCategory}</span>
                        </div>
                        <div className="flex items-center justify-between mb-3 p-2 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-600">库存数量</span>
                            <span className={`text-lg font-bold ${(p.stock || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {p.stock ?? 0}
                            </span>
                        </div>
                        <div className="flex border-t pt-3 gap-2">
                            <button onClick={() => { setEditingProduct({ ...p, features: p.features.join('\\n') } as any); setShowProductModal(true) }} className="flex-1 py-1.5 text-xs bg-gray-50 text-gray-700 rounded hover:bg-gray-100 flex items-center justify-center">
                                <Edit size={14} className="mr-1" /> 编辑
                            </button>
                            <button onClick={() => handleDelete('/api/products', p.id, fetchProducts)} className="w-8 flex items-center justify-center text-red-400 hover:text-red-600 rounded hover:bg-red-50">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {filteredProducts.length === 0 && (
                <div className="text-center py-8 text-gray-400 bg-white rounded-lg border border-dashed">暂无商品</div>
            )}
        </div>
    );
    const renderTutorials = () => (
        <div className="space-y-4">
            <div className="flex justify-between"><h3 className="text-lg font-bold">教程管理</h3><button onClick={() => { setEditingTutorial({}); setShowTutorialModal(true) }} className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm"><Plus size={16} className="mr-1 inline" />新增</button></div>
            <div className="bg-white rounded shadow">
                <table className="w-full text-left text-sm"><thead className="bg-gray-50"><tr><th className="p-3">标题</th><th className="p-3">分类</th><th className="p-3">操作</th></tr></thead>
                    <tbody className="divide-y">{tutorials.map(t => (<tr key={t.id}><td className="p-3">{t.title}</td><td className="p-3">{t.category}</td><td className="p-3 flex gap-2"><button onClick={() => { setEditingTutorial({ ...t, tags: t.tags.join(',') } as any); setShowTutorialModal(true) }} className="text-blue-600"><Edit size={16} /></button><button onClick={() => handleDelete('/api/tutorials', t.id, fetchTutorials)} className="text-red-600"><Trash2 size={16} /></button></td></tr>))}</tbody>
                </table>
            </div>
        </div>
    );


    return (
        <div className="flex min-h-screen">
            <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 hidden md:block">
                <div className="p-6 border-b border-gray-100">
                    <h1 className="text-xl font-bold text-gray-900">管理后台</h1>
                </div>
                <nav className="mt-6 px-4 space-y-2">
                    {[
                        { id: 'overview', icon: Activity, label: '总览' },
                        { id: 'orders', icon: ShoppingCart, label: '订单' },
                        { id: 'products', icon: Box, label: '商品' },
                        { id: 'groups', icon: Users2, label: '拼团' },
                        { id: 'lotteries', icon: Gift, label: '抽奖' },
                        { id: 'tutorials', icon: FileText, label: '教程' },
                    ].map(item => (
                        <button key={item.id} onClick={() => setActiveTab(item.id as any)}
                            className={`flex items-center w-full px-4 py-2 rounded text-left transition-colors ${activeTab === item.id ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                            <item.icon size={18} className="mr-3" /> {item.label}
                        </button>
                    ))}
                </nav>
            </aside>
            <main className="flex-1 bg-gray-100 p-8 overflow-y-auto">
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'orders' && renderOrders()}
                {activeTab === 'products' && renderProducts()}
                {activeTab === 'groups' && renderGroups()}
                {activeTab === 'lotteries' && renderLotteries()}
                {activeTab === 'tutorials' && renderTutorials()}
            </main>

            {/* Product Modal */}
            {showProductModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">{editingProduct?.id ? '编辑' : '新增'}商品</h3>
                        <form onSubmit={saveProduct} className="space-y-3">
                            <div className="space-y-1"><label className="text-xs font-bold text-gray-500">商品标题</label><input required className="w-full border p-2 rounded" value={editingProduct?.title || ''} onChange={e => setEditingProduct({ ...editingProduct, title: e.target.value })} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-500">价格 (¥)</label><input type="number" required className="w-full border p-2 rounded" value={editingProduct?.price || ''} onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })} /></div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500">一级分类</label>
                                    <input
                                        list="category-options"
                                        required
                                        className="w-full border p-2 rounded"
                                        value={editingProduct?.category || ''}
                                        onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                                        placeholder="选择或输入..."
                                    />
                                    <datalist id="category-options">
                                        {categoryStructure.map(c => <option key={c.name} value={c.name} />)}
                                    </datalist>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500">二级分类 (可选)</label>
                                <input
                                    list="subcategory-options"
                                    className="w-full border p-2 rounded"
                                    value={editingProduct?.subCategory || ''}
                                    onChange={e => setEditingProduct({ ...editingProduct, subCategory: e.target.value })}
                                    placeholder="选择或输入..."
                                />
                                <datalist id="subcategory-options">
                                    {editingProduct?.category && categoryStructure.find(c => c.name === editingProduct.category)?.subCategories.map(sub => (
                                        <option key={sub} value={sub} />
                                    ))}
                                </datalist>
                            </div>
                            <div className="space-y-1"><label className="text-xs font-bold text-gray-500">库存数量</label><input type="number" min="0" className="w-full border p-2 rounded" value={editingProduct?.stock ?? 0} onChange={e => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) || 0 })} /></div>
                            <div className="space-y-1"><label className="text-xs font-bold text-gray-500">描述</label><textarea className="w-full border p-2 rounded" value={editingProduct?.description || ''} onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })} /></div>
                            <div className="space-y-1"><label className="text-xs font-bold text-gray-500">特点 (每行一个)</label><textarea className="w-full border p-2 rounded" value={typeof editingProduct?.features === 'string' ? editingProduct.features : editingProduct?.features?.join('\n') || ''} onChange={e => setEditingProduct({ ...editingProduct, features: e.target.value.split('\n') })} /></div>
                            <label className="flex items-center"><input type="checkbox" checked={editingProduct?.inStock ?? true} onChange={e => setEditingProduct({ ...editingProduct, inStock: e.target.checked })} /> <span className="ml-2">上架销售</span></label>
                            <div className="flex justify-end gap-2 mt-4"><button type="button" onClick={() => setShowProductModal(false)} className="px-3 py-1 bg-gray-200 rounded">取消</button><button type="submit" disabled={actionLoading} className="px-3 py-1 bg-indigo-600 text-white rounded">保存</button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* Group Modal */}
            {showGroupModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">{editingGroup?.id ? '编辑' : '发起'}拼团</h3>
                        <form onSubmit={saveGroup} className="space-y-3">
                            <div className="space-y-1"><label className="text-xs font-bold text-gray-500">拼团标题</label><input required className="w-full border p-2 rounded" value={editingGroup?.title || ''} onChange={e => setEditingGroup({ ...editingGroup, title: e.target.value })} /></div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-500">价格 (¥)</label><input type="number" required className="w-full border p-2 rounded" value={editingGroup?.price || ''} onChange={e => setEditingGroup({ ...editingGroup, price: parseFloat(e.target.value) })} /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-500">目标人数</label><input type="number" required className="w-full border p-2 rounded" value={editingGroup?.targetCount || ''} onChange={e => setEditingGroup({ ...editingGroup, targetCount: parseInt(e.target.value) })} /></div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500">状态</label>
                                <select className="w-full border p-2 rounded" value={editingGroup?.status || '进行中'} onChange={e => setEditingGroup({ ...editingGroup, status: e.target.value })}>
                                    <option value="进行中">进行中 (开放加入)</option>
                                    <option value="已锁单">已锁单 (停止加入)</option>
                                    <option value="已结束">已结束 (关闭显示)</option>
                                </select>
                            </div>
                            <div className="bg-blue-50 p-2 rounded border border-blue-100">
                                <label className="flex items-center text-sm cursor-pointer">
                                    <input type="checkbox" checked={editingGroup?.autoRenew ?? false} onChange={e => setEditingGroup({ ...editingGroup, autoRenew: e.target.checked })} className="mr-2" />
                                    <span className="font-bold text-blue-800">满员自动续团</span>
                                </label>
                                <p className="text-xs text-blue-600 mt-1 pl-5">开启后，当本团达到目标人数锁单时，系统将自动创建一个相同配置的新团。</p>
                            </div>
                            <div className="space-y-1"><label className="text-xs font-bold text-gray-500">描述</label><textarea className="w-full border p-2 rounded" value={editingGroup?.description || ''} onChange={e => setEditingGroup({ ...editingGroup, description: e.target.value })} /></div>
                            <div className="space-y-1"><label className="text-xs font-bold text-gray-500">特点 (每行一个)</label><textarea className="w-full border p-2 rounded" value={typeof editingGroup?.features === 'string' ? editingGroup.features : (editingGroup?.features as string[])?.join('\\n') || ''} onChange={e => setEditingGroup({ ...editingGroup, features: e.target.value as any })} /></div>
                            <div className="flex justify-end gap-2 mt-4"><button type="button" onClick={() => setShowGroupModal(false)} className="px-3 py-1 bg-gray-200 rounded">取消</button><button type="submit" disabled={actionLoading} className="px-3 py-1 bg-indigo-600 text-white rounded">保存</button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* Lottery Modal */}
            {showLotteryModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">{editingLottery?.id ? '编辑' : '发布'}抽奖</h3>
                        <form onSubmit={saveLottery} className="space-y-3">
                            <div className="space-y-1"><label className="text-xs font-bold text-gray-500">活动标题</label><input required className="w-full border p-2 rounded" value={editingLottery?.title || ''} onChange={e => setEditingLottery({ ...editingLottery, title: e.target.value })} /></div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-500">开奖日期 (自动开奖时间)</label><input type="datetime-local" step="1" required className="w-full border p-2 rounded" value={editingLottery?.drawDate || ''} onChange={e => setEditingLottery({ ...editingLottery, drawDate: e.target.value })} /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-500">中奖名额</label><input type="number" required className="w-full border p-2 rounded" value={editingLottery?.winnersCount || ''} onChange={e => setEditingLottery({ ...editingLottery, winnersCount: parseInt(e.target.value) })} /></div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500">状态</label>
                                <select className="w-full border p-2 rounded" value={editingLottery?.status || '待开奖'} onChange={e => setEditingLottery({ ...editingLottery, status: e.target.value })}>
                                    <option value="待开奖">待开奖 (进行中)</option>
                                    <option value="已结束">已结束 (停止参与)</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-500">参与消耗积分</label><input type="number" required className="w-full border p-2 rounded" value={editingLottery?.entryCost || 0} onChange={e => setEditingLottery({ ...editingLottery, entryCost: parseInt(e.target.value) })} /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-500">最低参与人数</label><input type="number" min="1" className="w-full border p-2 rounded" value={editingLottery?.minParticipants || 1} onChange={e => setEditingLottery({ ...editingLottery, minParticipants: parseInt(e.target.value) })} /></div>
                            </div>
                            <div className="space-y-1"><label className="text-xs font-bold text-gray-500">描述</label><textarea className="w-full border p-2 rounded" value={editingLottery?.description || ''} onChange={e => setEditingLottery({ ...editingLottery, description: e.target.value })} /></div>
                            <div className="space-y-1"><label className="text-xs font-bold text-gray-500">奖品列表 (每行一个)</label><textarea className="w-full border p-2 rounded" value={typeof editingLottery?.prizes === 'string' ? editingLottery.prizes : (editingLottery?.prizes as string[])?.join('\\n') || ''} onChange={e => setEditingLottery({ ...editingLottery, prizes: e.target.value as any })} /></div>
                            <div className="flex justify-end gap-2 mt-4"><button type="button" onClick={() => setShowLotteryModal(false)} className="px-3 py-1 bg-gray-200 rounded">取消</button><button type="submit" disabled={actionLoading} className="px-3 py-1 bg-indigo-600 text-white rounded">保存</button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* Tutorial Modal */}
            {showTutorialModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-bold mb-4">{editingTutorial?.id ? '编辑' : '发布'}教程</h3>
                        <form onSubmit={saveTutorial} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500">标题</label>
                                    <input required className="w-full border p-2 rounded" value={editingTutorial?.title || ''} onChange={e => setEditingTutorial({ ...editingTutorial, title: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500">分类</label>
                                    <input required className="w-full border p-2 rounded" value={editingTutorial?.category || ''} onChange={e => setEditingTutorial({ ...editingTutorial, category: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500">简介</label>
                                <input required className="w-full border p-2 rounded" value={editingTutorial?.summary || ''} onChange={e => setEditingTutorial({ ...editingTutorial, summary: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500">标签 (逗号分隔)</label>
                                <input className="w-full border p-2 rounded" value={typeof editingTutorial?.tags === 'string' ? editingTutorial.tags : editingTutorial?.tags?.join(',') || ''} onChange={e => setEditingTutorial({ ...editingTutorial, tags: e.target.value as any })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500">内容 (Markdown)</label>
                                <MarkdownEditor
                                    value={editingTutorial?.content || ''}
                                    onChange={(content) => setEditingTutorial({ ...editingTutorial, content })}
                                    minHeight="350px"
                                />
                            </div>
                            <label className="flex items-center">
                                <input type="checkbox" checked={editingTutorial?.isLocked ?? false} onChange={e => setEditingTutorial({ ...editingTutorial, isLocked: e.target.checked })} />
                                <span className="ml-2">锁定内容 (需付费/会员)</span>
                            </label>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setShowTutorialModal(false)} className="px-4 py-2 bg-gray-200 rounded">取消</button>
                                <button type="submit" disabled={actionLoading} className="px-4 py-2 bg-indigo-600 text-white rounded">{actionLoading ? '保存中...' : '保存'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Participants View Modal */}
            {showParticipantsModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold">查看参与者名单</h3>
                                {currentViewType === 'GROUP' && (
                                    <span className={`text-xs px-2 py-0.5 rounded ${groups.find(g => g.id === currentViewId)?.status === '已结束' ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-600'
                                        }`}>
                                        {groups.find(g => g.id === currentViewId)?.status === '已结束' ? '仅查看' : '可管理'}
                                    </span>
                                )}
                            </div>
                            <button onClick={() => setShowParticipantsModal(false)}><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {participantsLoading ? (
                                <div className="text-center py-8">加载中...</div>
                            ) : participantsList.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">暂无参与者</div>
                            ) : (
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            {currentViewType === 'LOTTERY' && <th className="p-3">用户名</th>}
                                            {currentViewType === 'GROUP' && <th className="p-3">用户昵称</th>}
                                            <th className="p-3">联系方式</th>
                                            <th className="p-3">参与时间</th>
                                            {currentViewType === 'LOTTERY' && <th className="p-3">中奖状态</th>}
                                            {currentViewType === 'GROUP' && <th className="p-3">用户ID</th>}
                                            {currentViewType === 'GROUP' && <th className="p-3">数量</th>}
                                            {currentViewType === 'GROUP' && groups.find(g => g.id === currentViewId)?.status !== '已结束' && <th className="p-3">操作</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {participantsList.map(p => (
                                            <tr key={p.id} className={p.isWinner ? 'bg-green-50' : 'hover:bg-gray-50'}>
                                                {currentViewType === 'LOTTERY' && (
                                                    <td className="p-3 font-medium">{p.name || '未知用户'}</td>
                                                )}
                                                {currentViewType === 'GROUP' && (
                                                    <td className="p-3 font-medium">{p.users?.name || '匿名'}</td>
                                                )}
                                                <td className="p-3">
                                                    <span className="font-mono block">{p.contact || '-'}</span>
                                                    {p.savedContacts && p.savedContacts.length > 0 && (
                                                        <div className="mt-1 space-y-0.5">
                                                            <span className="text-xs text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">备用:</span>
                                                            {p.savedContacts.map((c: any, i: number) => (
                                                                <div key={i} className="text-xs text-gray-500">
                                                                    {c.label || c.type}: {c.value}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-3 text-gray-600">{new Date(p.joinedAt || '').toLocaleString()}</td>
                                                {currentViewType === 'LOTTERY' && (
                                                    <td className="p-3">
                                                        {p.isWinner ? <span className="text-green-600 font-bold flex items-center"><Gift size={14} className="mr-1" />中奖</span> : <span className="text-gray-400">未中奖</span>}
                                                    </td>
                                                )}
                                                {currentViewType === 'GROUP' && (
                                                    <td className="p-3">
                                                        <span
                                                            className="font-mono text-xs text-gray-500 cursor-pointer hover:text-indigo-600 flex items-center gap-1 group/copy"
                                                            onClick={() => { navigator.clipboard.writeText(p.userId); showToast('用户ID已复制', 'success'); }}
                                                            title="点击复制完整ID"
                                                        >
                                                            {p.userId.substring(0, 8)}...
                                                            <Copy size={10} className="opacity-0 group-hover/copy:opacity-100" />
                                                        </span>
                                                    </td>
                                                )}
                                                {currentViewType === 'GROUP' && (
                                                    <td className="p-3 font-bold">{p.quantity || 1}</td>
                                                )}
                                                {currentViewType === 'GROUP' && groups.find(g => g.id === currentViewId)?.status !== '已结束' && (
                                                    <td className="p-3 flex gap-2">
                                                        <button onClick={() => handleParticipantUpdate(p.userId, p.quantity || 1)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="修改数量">
                                                            <Edit size={14} />
                                                        </button>
                                                        <button onClick={() => handleParticipantDelete(p.userId)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="移除成员">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="pt-4 border-t mt-4 text-right">
                            <button onClick={() => setShowParticipantsModal(false)} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">关闭</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
