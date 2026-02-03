'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Clock, CheckCircle, XCircle, Package, Search, Trash2, ArrowRight, ChevronDown, Filter } from 'lucide-react';
import { useToast } from '@/lib/GlobalToast';
import { useConfirm } from '@/lib/ConfirmContext';
import type { Order } from '@/types';
import { formatBeijing } from '@/lib/timezone';

// Extend Order type to include extra fields from API
interface ExtendedOrder extends Order {
    category?: string;
    subCategory?: string;
    // user's saved contacts from join
    savedContacts?: { type: string; value: string; }[];
}

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<ExtendedOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCancelled, setShowCancelled] = useState(false);
    const [showDeleted, setShowDeleted] = useState(false);
    const [globalSearch, setGlobalSearch] = useState('');
    const { showToast } = useToast();
    const { confirm } = useConfirm();

    // Independent Filter States for each column
    const [pendingFilters, setPendingFilters] = useState({ category: '', subCategory: '' });
    const [processingFilters, setProcessingFilters] = useState({ category: '', subCategory: '' });
    const [completedFilters, setCompletedFilters] = useState({ category: '', subCategory: '' });
    const [cancelledFilters, setCancelledFilters] = useState({ category: '', subCategory: '' });
    const [deletedFilters, setDeletedFilters] = useState({ category: '', subCategory: '' });

    // Rename Button
    const [allProducts, setAllProducts] = useState<any[]>([]);

    useEffect(() => {
        fetchOrders();
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await fetch('/api/products?limit=1000');
            if (res.ok) setAllProducts(await res.json());
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    }

    const fetchOrders = async () => {
        try {
            const res = await fetch('/api/orders');
            if (res.ok) setOrders(await res.json());
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    // Extract unique categories for filter dropdowns from ALL products + current orders
    const categories = useMemo(() => {
        const cats = new Set<string>();
        const subs = new Map<string, Set<string>>();

        // Helper to add cat/sub
        const add = (c?: string, s?: string) => {
            if (c) {
                cats.add(c);
                if (s) {
                    if (!subs.has(c)) subs.set(c, new Set());
                    subs.get(c)?.add(s);
                }
            }
        };

        // From Orders
        orders.forEach(o => add(o.category, o.subCategory));
        // From All Products (to ensure filters exist even if no orders yet)
        allProducts.forEach(p => add(p.category, p.subCategory));

        return {
            categories: Array.from(cats),
            subCategories: subs
        };
    }, [orders, allProducts]);

    const updateStatus = async (id: string, status: string) => {
        // Optimistic update? No, safer to confirm first.
        const confirmed = await confirm({
            title: '确认更新状态',
            message: `确定要将订单状态更改为 "${status}" 吗？`,
            confirmText: '确认',
            cancelText: '取消'
        });
        if (!confirmed) return;

        try {
            const res = await fetch('/api/orders', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status })
            });
            if (res.ok) {
                showToast('状态已更新', 'success');
                fetchOrders();
            } else {
                showToast('更新失败', 'error');
            }
        } catch (error) {
            console.error('Error updating order:', error);
            showToast('更新出错', 'error');
        }
    };

    const deleteOrder = async (id: string, currentStatus: string) => {
        // For completed orders, admin can choose to "delete" (hide) or "cancel" (restore stock/points)
        if (currentStatus === '已完成') {
            const action = await new Promise<string | null>((resolve) => {
                // Simple choice - use confirm for each option
                confirm({
                    title: '选择操作',
                    message: '请选择操作类型：\n• 删除：仅从订单管理中隐藏（不影响库存和积分）\n• 取消：恢复库存、退回积分、标记为已取消',
                    confirmText: '删除订单',
                    cancelText: '取消订单'
                }).then((confirmed) => {
                    resolve(confirmed ? 'delete' : 'cancel');
                });
            });

            if (!action) return;

            try {
                const res = await fetch('/api/orders', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, action })
                });

                if (res.ok) {
                    showToast(action === 'delete' ? '订单已删除' : '订单已取消，库存和积分已恢复', 'success');
                    fetchOrders();
                } else {
                    showToast('操作失败', 'error');
                }
            } catch (error) {
                console.error('Error in order action:', error);
                showToast('操作出错', 'error');
            }
            return;
        }

        // For cancelled/deleted orders: permanent delete (or re-confirm cancel)
        if (currentStatus === '已取消' || currentStatus === '已删除') {
            const confirmed = await confirm({
                title: '确认永久删除',
                message: '此操作将永久删除订单记录，无法恢复。是否继续？',
                confirmText: '永久删除',
                cancelText: '再想想'
            });

            if (!confirmed) return;

            // For now, we don't support permanent delete - it stays as soft deleted
            showToast('已删除订单将保留在系统中供查阅', 'info');
            return;
        }

        // For other statuses (待联系, 已联系): cancel with stock restoration
        const confirmed = await confirm({
            title: '确认取消订单',
            message: '确定要取消此订单吗？这将恢复库存（如果是商品）。',
            confirmText: '取消订单',
            cancelText: '再想想'
        });

        if (!confirmed) return;

        try {
            const res = await fetch('/api/orders', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action: 'cancel' })
            });

            if (res.ok) {
                showToast('订单已取消', 'success');
                fetchOrders();
            } else {
                showToast('操作失败', 'error');
            }
        } catch (error) {
            console.error('Error canceling order:', error);
            showToast('操作出错', 'error');
        }
    };

    // Direct admin action (no confirmation dialog, action already chosen)
    const handleAdminAction = async (id: string, action: 'delete' | 'cancel') => {
        const confirmed = await confirm({
            title: action === 'delete' ? '确认删除订单' : '确认取消订单',
            message: action === 'delete'
                ? '删除后订单将从主列表中隐藏，不影响库存和积分。'
                : '取消后将恢复库存并退回积分（如有）。',
            confirmText: action === 'delete' ? '确认删除' : '确认取消',
            cancelText: '再想想'
        });

        if (!confirmed) return;

        try {
            const res = await fetch('/api/orders', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action })
            });

            if (res.ok) {
                showToast(action === 'delete' ? '订单已删除' : '订单已取消', 'success');
                fetchOrders();
            } else {
                showToast('操作失败', 'error');
            }
        } catch (error) {
            console.error('Error in admin action:', error);
            showToast('操作出错', 'error');
        }
    };

    // Generic Filter Helper
    const filterOrders = (list: ExtendedOrder[], filters: { category: string, subCategory: string }) => {
        return list.filter(o => {
            // Global Search matches
            if (globalSearch) {
                const term = globalSearch.toLowerCase();
                const matches =
                    o.itemName?.toLowerCase().includes(term) ||
                    o.contactDetails?.toLowerCase().includes(term) ||
                    o.id.toLowerCase().includes(term);
                if (!matches) return false;
            }
            // Category Filters
            if (filters.category && o.category !== filters.category) return false;
            if (filters.subCategory && o.subCategory !== filters.subCategory) return false;
            return true;
        });
    };

    const pendingOrders = filterOrders(orders.filter(o => o.status === '待联系'), pendingFilters);
    const processingOrders = filterOrders(orders.filter(o => o.status === '已联系'), processingFilters);
    const completedOrders = filterOrders(orders.filter(o => o.status === '已完成'), completedFilters);
    const cancelledOrders = filterOrders(orders.filter(o => o.status === '已取消'), cancelledFilters);
    const deletedOrders = filterOrders(orders.filter(o => o.status === '已删除'), deletedFilters);

    // Filter Component
    const FilterBar = ({
        filters,
        setFilters
    }: {
        filters: { category: string, subCategory: string },
        setFilters: Function
    }) => (
        <div className="flex gap-2 mb-3 bg-gray-50/50 p-2 rounded-lg border border-gray-100/50 text-xs">
            <div className="relative flex-1">
                <select
                    value={filters.category}
                    onChange={e => setFilters({ category: e.target.value, subCategory: '' })}
                    className="w-full appearance-none bg-white border border-gray-200 rounded px-2 py-1 pr-6 focus:outline-none focus:border-indigo-400"
                >
                    <option value="">全部分类</option>
                    {categories.categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative flex-1">
                <select
                    value={filters.subCategory}
                    onChange={e => setFilters({ ...filters, subCategory: e.target.value })}
                    disabled={!filters.category || !categories.subCategories.has(filters.category)}
                    className="w-full appearance-none bg-white border border-gray-200 rounded px-2 py-1 pr-6 focus:outline-none focus:border-indigo-400 disabled:bg-gray-50 disabled:text-gray-400"
                >
                    <option value="">全部二级</option>
                    {filters.category && Array.from(categories.subCategories.get(filters.category) || []).map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {/* Clear logic implied by selecting 'All' */}
        </div>
    );

    const OrderCard = ({ order }: { order: ExtendedOrder }) => {
        const [showContacts, setShowContacts] = useState(false);
        const unitPrice = order.cost && order.quantity ? order.cost / order.quantity : 0;
        const totalPrice = order.cost || 0;

        return (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all group relative">
                {/* Action buttons at top-right based on status */}
                <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Completed orders: show both Delete and Cancel */}
                    {order.status === '已完成' && (
                        <>
                            <button
                                onClick={() => handleAdminAction(order.id, 'delete')}
                                className="px-2 py-1 text-[10px] font-medium text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                title="删除（仅隐藏）"
                            >
                                删除
                            </button>
                            <button
                                onClick={() => handleAdminAction(order.id, 'cancel')}
                                className="px-2 py-1 text-[10px] font-medium text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors"
                                title="取消（恢复库存和积分）"
                            >
                                取消
                            </button>
                        </>
                    )}
                    {/* Pending and Processing orders: show only Cancel */}
                    {(order.status === '待联系' || order.status === '已联系') && (
                        <button
                            onClick={() => handleAdminAction(order.id, 'cancel')}
                            className="px-2 py-1 text-[10px] font-medium text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors"
                            title="取消订单"
                        >
                            取消
                        </button>
                    )}
                </div>

                <div className="mb-3 pr-6">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                            {order.category || order.itemType}
                        </span>
                        {order.subCategory && order.subCategory !== '未分类' && (
                            <span className="text-[10px] text-gray-400">/ {order.subCategory}</span>
                        )}
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm line-clamp-2">{order.itemName}</h4>
                </div>

                <div className="flex justify-between items-end mb-4 pb-3 border-b border-gray-50">
                    <div className="text-xs text-gray-500">
                        {order.quantity && order.quantity > 1 ? (
                            <span>￥{unitPrice.toFixed(2)} × {order.quantity}</span>
                        ) : (
                            <span>单价</span>
                        )}
                    </div>
                    <div className="text-base font-bold text-indigo-600">
                        ￥{totalPrice.toFixed(2)}
                    </div>
                </div>

                <div className="space-y-2 text-xs mb-4">
                    <div className="flex flex-col items-start gap-1">
                        <div
                            className={`flex items-center gap-1.5 px-2 py-1 rounded border transition-colors cursor-pointer w-full ${showContacts ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                            onClick={() => setShowContacts(!showContacts)}
                        >
                            <span className="text-lg leading-none">{order.contactDetails?.includes('@') ? '📧' : '📱'}</span>
                            <span className="font-mono truncate flex-1">{order.contactDetails || '无联系方式'}</span>
                            {order.savedContacts && order.savedContacts.length > 0 && (
                                <ChevronDown size={12} className={`transform transition-transform duration-200 ${showContacts ? 'rotate-180 text-indigo-500' : 'text-gray-400'}`} />
                            )}
                        </div>

                        {showContacts && order.savedContacts && order.savedContacts.length > 0 && (
                            <div className="w-full bg-white rounded-lg border border-indigo-100 shadow-sm p-2 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="text-[10px] font-bold text-gray-400 px-2 py-0.5 uppercase tracking-wider mb-1">所有联系方式</div>
                                {order.savedContacts.map((c, i) => (
                                    <div key={i} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded text-xs text-gray-700 transition-colors cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(c.value).then(() => showToast('已复制', 'success'));
                                        }}>
                                        {c.type === 'qq' ? <div className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium min-w-[30px] text-center">QQ</div> :
                                            c.type === 'wechat' ? <div className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded font-medium min-w-[30px] text-center">WX</div> :
                                                c.type === 'email' ? <div className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium min-w-[30px] text-center">Email</div> :
                                                    <div className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium min-w-[30px] text-center">{c.type}</div>}
                                        <span className="select-all font-mono text-gray-600 truncate">{c.value}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 text-gray-400">
                        <Clock size={12} />
                        <span>{formatBeijing(order.createdAt)}</span>
                    </div>
                </div>

                <div className="flex gap-2 mt-auto">
                    {order.status === '待联系' && (
                        <button
                            onClick={() => updateStatus(order.id, '已联系')}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200"
                        >
                            联系处理 <ArrowRight size={12} />
                        </button>
                    )}
                    {order.status === '已联系' && (
                        <button
                            onClick={() => updateStatus(order.id, '已完成')}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 transition-all shadow-sm shadow-emerald-200"
                        >
                            标记完成 <CheckCircle size={12} />
                        </button>
                    )}
                    {order.status === '已完成' && (
                        <div className="w-full py-2 text-center text-xs text-emerald-600 font-medium bg-emerald-50 rounded-lg border border-emerald-100 flex items-center justify-center gap-1">
                            <CheckCircle size={12} /> 交易成功
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6">
            {/* Header & Global Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">订单管理</h1>
                    <p className="text-sm text-gray-500 mt-1">处理用户订单、发货及状态追踪</p>
                    <div className="mt-2 text-xs text-gray-400 flex gap-4">
                        <span><strong className="text-gray-600">删除</strong> = 仅隐藏订单，不影响库存和积分</span>
                        <span><strong className="text-gray-600">取消</strong> = 恢复库存、退回积分、标记为已取消</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative min-w-[300px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="搜索全局订单 (名称/联系方式/ID)"
                            value={globalSearch}
                            onChange={e => setGlobalSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    <button
                        onClick={() => { setShowCancelled(!showCancelled); if (!showCancelled) setShowDeleted(false); }}
                        className={`px-4 py-2 rounded-lg text-xs font-medium border transition-all flex items-center gap-2 ${showCancelled
                            ? 'bg-orange-600 text-white border-orange-600 shadow-lg'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                        <XCircle size={14} />
                        已取消 ({cancelledOrders.length})
                    </button>
                    <button
                        onClick={() => { setShowDeleted(!showDeleted); if (!showDeleted) setShowCancelled(false); }}
                        className={`px-4 py-2 rounded-lg text-xs font-medium border transition-all flex items-center gap-2 ${showDeleted
                            ? 'bg-gray-700 text-white border-gray-700 shadow-lg'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                        <Trash2 size={14} />
                        已删除 ({deletedOrders.length})
                    </button>
                </div>
            </div>

            {showCancelled && (
                // Cancelled View (Full Width)
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-orange-50 rounded-2xl border border-orange-200 p-4">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h3 className="font-bold text-orange-700 flex items-center gap-2">
                                <XCircle size={18} /> 已取消订单 ({cancelledOrders.length})
                            </h3>
                            <div className="w-64">
                                <FilterBar filters={cancelledFilters} setFilters={setCancelledFilters} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {cancelledOrders.map(o => <OrderCard key={o.id} order={o} />)}
                            {cancelledOrders.length === 0 && (
                                <div className="col-span-full py-12 text-center text-orange-400">无已取消订单</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showDeleted && (
                // Deleted View (Full Width)
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-gray-100 rounded-2xl border border-gray-300 p-4">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h3 className="font-bold text-gray-600 flex items-center gap-2">
                                <Trash2 size={18} /> 已删除订单 ({deletedOrders.length})
                            </h3>
                            <div className="w-64">
                                <FilterBar filters={deletedFilters} setFilters={setDeletedFilters} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {deletedOrders.map(o => <OrderCard key={o.id} order={o} />)}
                            {deletedOrders.length === 0 && (
                                <div className="col-span-full py-12 text-center text-gray-400">无已删除订单</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {!showCancelled && !showDeleted && (
                // Kanban Board
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-280px)] min-h-[600px]">
                    {/* Pending Column */}
                    <div className="flex flex-col bg-gray-50/50 rounded-2xl border border-gray-100 shadow-inner overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                    待联系
                                    <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full">{pendingOrders.length}</span>
                                </h3>
                            </div>
                            <FilterBar filters={pendingFilters} setFilters={setPendingFilters} />
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                            {pendingOrders.map(o => <OrderCard key={o.id} order={o} />)}
                            {pendingOrders.length === 0 && (
                                <div className="py-12 text-center text-gray-400 text-xs">暂无待联系订单</div>
                            )}
                        </div>
                    </div>

                    {/* Processing Column */}
                    <div className="flex flex-col bg-gray-50/50 rounded-2xl border border-gray-100 shadow-inner overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                    处理中
                                    <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full">{processingOrders.length}</span>
                                </h3>
                            </div>
                            <FilterBar filters={processingFilters} setFilters={setProcessingFilters} />
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                            {processingOrders.map(o => <OrderCard key={o.id} order={o} />)}
                            {processingOrders.length === 0 && (
                                <div className="py-12 text-center text-gray-400 text-xs">无处理中订单</div>
                            )}
                        </div>
                    </div>

                    {/* Completed Column */}
                    <div className="flex flex-col bg-gray-50/50 rounded-2xl border border-gray-100 shadow-inner overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    已完成
                                    <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full">{completedOrders.length}</span>
                                </h3>
                            </div>
                            <FilterBar filters={completedFilters} setFilters={setCompletedFilters} />
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                            {completedOrders.slice(0, 20).map(o => <OrderCard key={o.id} order={o} />)}
                            {completedOrders.length > 20 && (
                                <div className="py-4 text-center text-gray-400 text-xs">仅显示最近 20 条</div>
                            )}
                            {completedOrders.length === 0 && (
                                <div className="py-12 text-center text-gray-400 text-xs">暂无历史订单</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
