'use client';

import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
    Users, ShoppingCart, Activity, AlertCircle, Check, X, Box, FileText, Plus, Edit, Trash2, Gift, Users2, Play, Eye, Repeat, List, Grid, Lock, Unlock
} from 'lucide-react';
import { Order, Product, Tutorial } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { formatBeijing, utcToBeijingInputString } from '@/lib/timezone';
import { useRealtimeSubscription } from '@/lib/useRealtimeSubscription';
import MarkdownEditor from '@/components/MarkdownEditor';


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
                alert('操作失败');
            }
        } catch (e) {
            console.error(e);
            alert('发生错误');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (url: string, id: string, refreshFn?: () => Promise<void>) => {
        if (!confirm('确定删除吗？')) return;
        try {
            await fetch(url, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
            // Immediately refresh only the relevant data (silent)
            if (refreshFn) await refreshFn();
        } catch (e) { console.error(e); }
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

    // Specific Feature Handlers
    const executeDraw = async (id: string) => {
        if (!confirm('确定现在开奖吗？系统将自动随机抽取中奖者。')) return;
        try {
            const res = await fetch('/api/lottery/draw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lotteryId: id })
            });
            if (res.ok) {
                const data = await res.json();
                alert(`开奖成功！共有 ${data.winnersCount} 位中奖者。`);
                fetchLotteries(true);
            } else {
                const err = await res.json();
                alert('开奖失败: ' + (err.error || '未知错误'));
            }
        } catch (e) { console.error(e); alert('网络错误'); }
    };

    const viewParticipants = async (type: 'GROUP' | 'LOTTERY', id: string) => {
        setCurrentViewType(type);
        setCurrentViewId(id);
        setShowParticipantsModal(true);
        setParticipantsLoading(true);
        setParticipantsList([]);

        try {
            if (type === 'GROUP') {
                const { data, error } = await supabase
                    .from('group_participants')
                    // Select contact_info directly from this row, plus users join for fallback
                    .select('user_id, joined_at, quantity, contact_info, users(email, name)')
                    .eq('group_id', id);

                if (error) throw error;

                const aggregated = data.reduce((acc: any, d: any) => {
                    const oderId = d.user_id || 'anonymous'; // handle null user_id
                    if (!acc[oderId]) {
                        acc[oderId] = {
                            id: oderId,
                            userId: oderId,
                            // Prioritize participant-row contact_info, fallback to user email
                            contact: d.contact_info || d.users?.email || '-',
                            joinedAt: d.joined_at,
                            quantity: 0
                        };
                    }
                    acc[oderId].quantity += (d.quantity || 1);
                    return acc;
                }, {});

                setParticipantsList(Object.values(aggregated));
            } else {
                const { data, error } = await supabase
                    .from('lottery_entries')
                    .select('user_id, entered_at, is_winner, users(email, name, contact_info)')
                    .eq('lottery_id', id);
                if (error) throw error;
                const list = data.map((d: any) => ({
                    id: d.user_id,
                    userId: d.user_id,
                    name: d.users?.name || '未知用户',
                    contact: d.users?.contact_info || d.users?.email || '-',
                    joinedAt: d.entered_at,
                    isWinner: d.is_winner,
                    quantity: 1
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

    const renderOrders = () => {
        const filteredOrders = orderFilter === '全部' ? orders : orders.filter(o => o.status === orderFilter);

        return (
            <div className="space-y-4">
                {/* Status Filter Tabs */}
                <div className="flex gap-2 flex-wrap">
                    {orderStatuses.map(status => (
                        <button
                            key={status}
                            onClick={() => setOrderFilter(status)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${orderFilter === status ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                            {status}
                            <span className="ml-1 opacity-70">
                                ({status === '全部' ? orders.length : orders.filter(o => o.status === status).length})
                            </span>
                        </button>
                    ))}
                </div>

                <div className="bg-white rounded shadow text-sm">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 uppercase font-medium text-gray-700"><tr><th className="p-3">商品</th><th className="p-3">数量</th><th className="p-3">金额</th><th className="p-3">联系</th><th className="p-3">状态</th><th className="p-3">操作</th></tr></thead>
                        <tbody className="divide-y">
                            {filteredOrders.length === 0 ? (
                                <tr><td colSpan={6} className="p-4 text-center text-gray-400">暂无订单</td></tr>
                            ) : (
                                filteredOrders.map(o => (
                                    <tr key={o.id} className="hover:bg-gray-50">
                                        <td className="p-3">{o.itemName} <span className="text-xs text-gray-400 block">{o.itemType}</span></td>
                                        <td className="p-3"><span className="font-bold text-indigo-600">×{o.quantity || 1}</span></td>
                                        <td className="p-3"><span className="font-bold">¥{o.cost || 0}</span></td>
                                        <td className="p-3">{o.contactDetails}</td>
                                        <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${o.status === '已完成' ? 'bg-green-100 text-green-800' : o.status === '待联系' ? 'bg-amber-100 text-amber-800' : o.status === '已取消' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{o.status}</span></td>
                                        <td className="p-3 flex gap-2">
                                            <button onClick={() => updateOrderStatus(o.id, '已联系')} className="text-blue-600 hover:bg-blue-50 p-1 rounded" title="已联系"><Activity size={16} /></button>
                                            <button onClick={() => updateOrderStatus(o.id, '已完成')} className="text-green-600 hover:bg-green-50 p-1 rounded" title="已完成"><Check size={16} /></button>
                                            <button onClick={() => updateOrderStatus(o.id, '已取消')} className="text-red-600 hover:bg-red-50 p-1 rounded" title="已取消"><X size={16} /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderGroupSection = (title: string, items: GroupBuy[], icon: React.ReactNode) => (
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
                                <span className={`text-xs px-2 py-0.5 rounded-full ${g.status === '进行中' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                    {g.status}
                                </span>
                            </div>
                            <div className="text-2xl font-bold text-indigo-600 mb-2">${g.price}</div>
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
                                <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, (g.currentCount / g.targetCount) * 100)}%` }}></div>
                            </div>

                            <div className="flex border-t pt-3 gap-2">
                                <button onClick={() => viewParticipants('GROUP', g.id)} className="flex-1 py-1.5 text-xs bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 flex items-center justify-center">
                                    <Users size={14} className="mr-1" /> 名单
                                </button>
                                <button onClick={() => { setEditingGroup({ ...g, features: g.features.join('\\n') } as any); setShowGroupModal(true) }} className="flex-1 py-1.5 text-xs bg-gray-50 text-gray-700 rounded hover:bg-gray-100 flex items-center justify-center">
                                    <Edit size={14} className="mr-1" /> 编辑
                                </button>
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
        const closedGroups = groups.filter(g => g.status !== '进行中');

        return (
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold">拼团管理</h3>
                    <button onClick={() => { setEditingGroup({}); setShowGroupModal(true) }} className="bg-indigo-600 text-white px-3 py-1.5 rounded flex items-center text-sm shadow-sm hover:bg-indigo-700 transition-colors">
                        <Plus size={16} className="mr-1" /> 发起新团
                    </button>
                </div>

                {renderGroupSection('进行中', activeGroups, <Unlock size={18} className="text-green-600" />)}
                {renderGroupSection('已锁单/结束', closedGroups, <Lock size={18} className="text-gray-500" />)}
            </div>
        );
    };

    const renderLotteries = () => {
        // Sort: 待开奖 first, then by draw date ascending
        const sortedLotteries = [...lotteries].sort((a, b) => {
            if (a.status === '待开奖' && b.status !== '待开奖') return -1;
            if (a.status !== '待开奖' && b.status === '待开奖') return 1;
            return new Date(a.drawDate).getTime() - new Date(b.drawDate).getTime();
        });

        return (
            <div className="space-y-4">
                <div className="flex justify-between">
                    <h3 className="text-lg font-bold">抽奖管理</h3>
                    <button onClick={() => { setEditingLottery({}); setShowLotteryModal(true) }} className="bg-indigo-600 text-white px-3 py-1.5 rounded flex items-center text-sm"><Plus size={16} className="mr-1" /> 发布抽奖</button>
                </div>
                <div className="bg-white rounded shadow text-sm">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50"><tr><th className="p-3">标题</th><th className="p-3">开奖日期</th><th className="p-3">参与</th><th className="p-3">状态</th><th className="p-3">操作</th></tr></thead>
                        <tbody className="divide-y">
                            {sortedLotteries.map(l => (
                                <tr key={l.id} className={l.status === '待开奖' ? 'bg-amber-50/50' : ''}>
                                    <td className="p-3">{l.title}</td>
                                    <td className="p-3">
                                        {formatBeijing(l.drawDate, 'yyyy-MM-dd')}
                                        <span className="text-xs text-gray-400 block">{formatBeijing(l.drawDate, 'HH:mm')}</span>
                                    </td>
                                    <td className="p-3">
                                        {l.participants} 人
                                        <button onClick={() => viewParticipants('LOTTERY', l.id)} className="ml-2 text-xs text-indigo-600 hover:underline">名单</button>
                                    </td>
                                    <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${l.status === '待开奖' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>{l.status}</span></td>
                                    <td className="p-3 flex gap-2">
                                        {l.status === '待开奖' && (
                                            <button onClick={() => executeDraw(l.id)} className="text-purple-600" title="立即开奖"><Play size={16} /></button>
                                        )}
                                        <button onClick={() => { setEditingLottery({ ...l, drawDate: utcToBeijingInputString(l.drawDate), prizes: l.prizes.join('\n') } as any); setShowLotteryModal(true) }} className="text-blue-600" title="编辑"><Edit size={16} /></button>
                                        <button onClick={() => handleDelete('/api/lottery', l.id, fetchLotteries)} className="text-red-600" title="删除"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // Products and Tutorials Renderers
    const [productFilter, setProductFilter] = useState('全部');
    const productCategories = ['全部', ...Array.from(new Set(products.map(p => p.category)))];
    const filteredProducts = productFilter === '全部' ? products : products.filter(p => p.category === productFilter);

    const renderProducts = () => (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">商品管理</h3>
                <button onClick={() => { setEditingProduct({}); setShowProductModal(true) }} className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm flex items-center hover:bg-indigo-700 transition-colors"><Plus size={16} className="mr-1" />新增</button>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 flex-wrap">
                {productCategories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setProductFilter(cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${productFilter === cat ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                        {cat}
                        {cat !== '全部' && <span className="ml-1 opacity-70">({products.filter(p => p.category === cat).length})</span>}
                    </button>
                ))}
            </div>

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
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">{p.category}</span>
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
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-500">价格 (¥)</label><input type="number" required className="w-full border p-2 rounded" value={editingProduct?.price || ''} onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })} /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-500">分类</label><input required className="w-full border p-2 rounded" value={editingProduct?.category || ''} onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })} /></div>
                            </div>
                            <div className="space-y-1"><label className="text-xs font-bold text-gray-500">库存数量</label><input type="number" min="0" className="w-full border p-2 rounded" value={editingProduct?.stock ?? 0} onChange={e => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) || 0 })} /></div>
                            <div className="space-y-1"><label className="text-xs font-bold text-gray-500">描述</label><textarea className="w-full border p-2 rounded" value={editingProduct?.description || ''} onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })} /></div>
                            <div className="space-y-1"><label className="text-xs font-bold text-gray-500">特点 (每行一个)</label><textarea className="w-full border p-2 rounded" value={typeof editingProduct?.features === 'string' ? editingProduct.features : editingProduct?.features?.join('\\n') || ''} onChange={e => setEditingProduct({ ...editingProduct, features: e.target.value })} /></div>
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
                            <div className="space-y-1"><label className="text-xs font-bold text-gray-500">特点 (每行一个)</label><textarea className="w-full border p-2 rounded" value={typeof editingGroup?.features === 'string' ? editingGroup.features : (editingGroup?.features as string[])?.join('\\n') || ''} onChange={e => setEditingGroup({ ...editingGroup, features: e.target.value })} /></div>
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
                            <div className="space-y-1"><label className="text-xs font-bold text-gray-500">奖品列表 (每行一个)</label><textarea className="w-full border p-2 rounded" value={typeof editingLottery?.prizes === 'string' ? editingLottery.prizes : (editingLottery?.prizes as string[])?.join('\\n') || ''} onChange={e => setEditingLottery({ ...editingLottery, prizes: e.target.value })} /></div>
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
                                <input className="w-full border p-2 rounded" value={typeof editingTutorial?.tags === 'string' ? editingTutorial.tags : editingTutorial?.tags?.join(',') || ''} onChange={e => setEditingTutorial({ ...editingTutorial, tags: e.target.value })} />
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
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">查看参与者名单</h3>
                            <button onClick={() => setShowParticipantsModal(false)}><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {participantsLoading ? (
                                <div className="text-center py-8">加载中...</div>
                            ) : participantsList.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">暂无参与者</div>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {currentViewType === 'LOTTERY' && <th className="p-3">用户名</th>}
                                            <th className="p-3">联系方式</th>
                                            <th className="p-3">参与时间</th>
                                            {currentViewType === 'LOTTERY' && <th className="p-3">中奖状态</th>}
                                            {currentViewType === 'GROUP' && <th className="p-3">用户ID</th>}
                                            {currentViewType === 'GROUP' && <th className="p-3">数量</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {participantsList.map(p => (
                                            <tr key={p.id} className={p.isWinner ? 'bg-green-50' : ''}>
                                                {currentViewType === 'LOTTERY' && (
                                                    <td className="p-3 font-medium">{p.name || '未知用户'}</td>
                                                )}
                                                <td className="p-3">
                                                    <span className="font-bold">{p.contact || '-'}</span>
                                                </td>
                                                <td className="p-3">{new Date(p.joinedAt || '').toLocaleString()}</td>
                                                {currentViewType === 'LOTTERY' && (
                                                    <td className="p-3">
                                                        {p.isWinner ? <span className="text-green-600 font-bold flex items-center"><Gift size={14} className="mr-1" />中奖</span> : <span className="text-gray-400">未中奖</span>}
                                                    </td>
                                                )}
                                                {currentViewType === 'GROUP' && (
                                                    <td className="p-3 font-mono text-xs">{p.userId.substring(0, 8)}...</td>
                                                )}
                                                {currentViewType === 'GROUP' && (
                                                    <td className="p-3">{p.quantity || 1}</td>
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
