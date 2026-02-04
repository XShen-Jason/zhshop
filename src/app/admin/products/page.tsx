'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Flame, Search, ChevronDown, Package, Layers, Settings, RefreshCw, Filter, X, Check, Save, ArrowUpDown, Tag } from 'lucide-react';
import { useToast } from '@/lib/GlobalToast';
import { useConfirm } from '@/lib/ConfirmContext';
import { formatBeijing } from '@/lib/timezone';
import type { Product } from '@/types';

// Helper Component for Category Badges
const CategoryBadge = ({ c, s }: { c: string, s?: string }) => (
    <div className="flex flex-wrap items-center gap-1.5">
        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100">
            {c}
        </span>
        {s && s !== '未分类' && (
            <span className="px-2 py-0.5 rounded-md bg-white text-gray-500 text-[10px] border border-gray-100 flex items-center gap-1 shadow-sm">
                <span className="text-gray-300">↳</span> {s}
            </span>
        )}
    </div>
);

type SortField = 'updatedAt' | 'price' | 'stock';
type SortOrder = 'asc' | 'desc' | null;

export default function AdminProductsPage() {
    // --- State ---
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Sorting
    const [sortField, setSortField] = useState<SortField>('updatedAt');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    // Advanced Filters
    const [filters, setFilters] = useState({
        category: '',
        subCategory: ''
    });

    // Modal States
    const [showEditModal, setShowEditModal] = useState(false);
    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

    const { showToast } = useToast();
    const { confirm } = useConfirm();

    // --- Computed ---
    const categories = useMemo(() => {
        const cats = new Set<string>();
        const subs = new Map<string, Set<string>>();

        products.forEach(p => {
            if (p.category) {
                cats.add(p.category);
                if (p.subCategory) {
                    if (!subs.has(p.category)) subs.set(p.category, new Set());
                    subs.get(p.category)?.add(p.subCategory);
                }
            }
        });

        return {
            list: Array.from(cats).sort(),
            subs
        };
    }, [products]);

    const filteredAndSortedProducts = useMemo(() => {
        let result = products.filter(p => {
            // Category Filter
            if (filters.category && p.category !== filters.category) return false;
            // SubCategory Filter
            if (filters.subCategory && p.subCategory !== filters.subCategory) return false;

            // Search Filter
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const matches =
                    p.title?.toLowerCase().includes(term) ||
                    p.category?.toLowerCase().includes(term) ||
                    p.id.toLowerCase().includes(term);
                if (!matches) return false;
            }
            return true;
        });

        // Sorting
        if (sortOrder) {
            result.sort((a, b) => {
                // Always put Hot items first if sorting by default (updatedAt)
                if (sortField === 'updatedAt' && a.isHot !== b.isHot) {
                    return a.isHot ? -1 : 1;
                }

                let valA: any = a[sortField];
                let valB: any = b[sortField];

                // Handle date
                if (sortField === 'updatedAt') {
                    valA = new Date(valA || 0).getTime();
                    valB = new Date(valB || 0).getTime();
                }

                if (valA === valB) return 0;

                const comparison = valA > valB ? 1 : -1;
                return sortOrder === 'asc' ? comparison : -comparison;
            });
        }

        return result;
    }, [products, filters, searchTerm, sortField, sortOrder]);

    // --- Effects ---
    useEffect(() => {
        fetchProducts();
    }, []);

    // --- Actions ---
    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/products?limit=1000');
            if (res.ok) setProducts(await res.json());
        } catch (error) {
            console.error('Error:', error);
            showToast('获取商品列表失败', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (field: SortField) => {
        if (sortField !== field) {
            // New field -> Start Descending
            setSortField(field);
            setSortOrder('desc');
        } else {
            // Same field -> Toggle: Desc -> Asc -> Off -> Desc
            if (sortOrder === 'desc') setSortOrder('asc');
            else if (sortOrder === 'asc') setSortOrder(null);
            else setSortOrder('desc');
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const confirmed = await confirm({
            title: '确认删除',
            message: '确定要删除此商品吗？此操作无法撤销。',
            confirmText: '删除',
            cancelText: '取消'
        });
        if (!confirmed) return;

        try {
            const res = await fetch('/api/products', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (res.ok) {
                showToast('商品已删除', 'success');
                fetchProducts();
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('删除失败', 'error');
        }
    };

    const toggleHot = async (id: string, currentIsHot: boolean, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const res = await fetch('/api/products', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isHot: !currentIsHot })
            });
            if (res.ok) {
                setProducts(prev => prev.map(p => p.id === id ? { ...p, isHot: !currentIsHot } : p));
                showToast(currentIsHot ? '已取消热销' : '已设为热销', 'success');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const toggleStock = async (id: string, currentStock: boolean, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const res = await fetch('/api/products', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, inStock: !currentStock })
            });
            if (res.ok) {
                setProducts(prev => prev.map(p => p.id === id ? { ...p, inStock: !currentStock } : p));
                showToast(currentStock ? '已下架' : '已上架', 'success');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleRenameCategory = async (oldName: string, newName: string, type: 'products' | 'tutorials', scope: 'category' | 'subCategory', parentCategory?: string) => {
        try {
            const res = await fetch('/api/categories', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldName, newName, type, scope, parentCategory })
            });
            if (res.ok) {
                showToast('分类已更新', 'success');
                fetchProducts();
                return true;
            } else {
                const data = await res.json();
                showToast(data.error || '更新失败', 'error');
                return false;
            }
        } catch (error) {
            console.error('Error renaming category:', error);
            showToast('更新出错', 'error');
            return false;
        }
    };

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProduct) return;

        try {
            const payload = {
                ...editingProduct,
                price: parseFloat(editingProduct.price?.toString() || '0'),
                stock: parseInt(editingProduct.stock?.toString() || '0', 10),
            };

            const res = await fetch('/api/products', {
                method: payload.id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showToast(payload.id ? '商品已更新' : '商品已创建', 'success');
                setShowEditModal(false);
                setEditingProduct(null);
                fetchProducts();
            } else {
                showToast('保存失败', 'error');
            }
        } catch (error) {
            console.error('Save error:', error);
            showToast('保存出错', 'error');
        }
    };

    // --- Sub Components ---
    const CategoryManager = () => {
        const [activeTab, setActiveTab] = useState<'category' | 'subCategory'>('category');
        const [editingName, setEditingName] = useState<string | null>(null);
        const [editValue, setEditValue] = useState('');

        const list = activeTab === 'category'
            ? categories.list
            : Array.from(categories.subs.entries()).flatMap(([parent, subs]) =>
                Array.from(subs).map(sub => ({ parent, sub }))
            );

        const startEdit = (name: string) => {
            setEditingName(name);
            setEditValue(name);
        };

        const saveEdit = async (oldName: string, parent?: string) => {
            if (!editValue.trim() || editValue === oldName) {
                setEditingName(null);
                return;
            }
            const success = await handleRenameCategory(oldName, editValue, 'products', activeTab, parent);
            if (success) setEditingName(null);
        };

        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowCategoryManager(false)}>
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                            <Layers size={20} className="text-indigo-600" /> 分类管理
                        </h3>
                        <button onClick={() => setShowCategoryManager(false)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex border-b border-gray-100">
                        <button
                            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'category' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
                            onClick={() => setActiveTab('category')}
                        >
                            一级分类 ({categories.list.length})
                        </button>
                        <button
                            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'subCategory' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
                            onClick={() => setActiveTab('subCategory')}
                        >
                            二级分类 ({(list as any[]).length})
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50/50">
                        {list.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">暂无分类数据</div>}

                        {list.map((item: any, idx) => {
                            const name = activeTab === 'category' ? item : item.sub;
                            const parent = activeTab === 'category' ? undefined : item.parent;
                            const uniqueKey = activeTab === 'category' ? name : `${parent}-${name}`;
                            const isEditing = editingName === uniqueKey;

                            return (
                                <div key={idx} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-colors">
                                    <div className="flex items-center gap-3 flex-1">
                                        {activeTab === 'subCategory' && (
                                            <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 whitespace-nowrap">
                                                {parent}
                                            </span>
                                        )}
                                        {isEditing ? (
                                            <input
                                                autoFocus
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value)}
                                                className="border rounded px-2 py-1 text-sm w-full max-w-[200px] outline-indigo-500"
                                                onKeyDown={e => e.key === 'Enter' && saveEdit(name, parent)}
                                            />
                                        ) : (
                                            <span className="font-medium text-gray-700">{name}</span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {isEditing ? (
                                            <>
                                                <button onClick={() => saveEdit(name, parent)} className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700"><Check size={14} /></button>
                                                <button onClick={() => setEditingName(null)} className="p-1.5 bg-gray-100 text-gray-500 rounded hover:bg-gray-200"><X size={14} /></button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => startEdit(uniqueKey)}
                                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                title="重命名"
                                            >
                                                <Edit size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    // Product feature helpers
    const addFeature = () => {
        if (!editingProduct) return;
        const newFeatures = [...(editingProduct.features || []), ''];
        setEditingProduct({ ...editingProduct, features: newFeatures });
    };

    const updateFeature = (index: number, value: string) => {
        if (!editingProduct) return;
        const newFeatures = [...(editingProduct.features || [])];
        newFeatures[index] = value;
        setEditingProduct({ ...editingProduct, features: newFeatures });
    };

    const removeFeature = (index: number) => {
        if (!editingProduct) return;
        const newFeatures = (editingProduct.features || []).filter((_, i) => i !== index);
        setEditingProduct({ ...editingProduct, features: newFeatures });
    };

    if (loading && products.length === 0) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Fixed Header */}
            <div className="flex-none space-y-4 pb-4 bg-gray-50 z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">商品管理</h1>
                        <p className="text-sm text-gray-500 mt-1">管理商品上架、库存及分类信息</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowCategoryManager(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                        >
                            <Layers size={16} /> 分类管理
                        </button>
                        <button
                            onClick={() => { setEditingProduct({ inStock: true }); setShowEditModal(true); }}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-colors"
                        >
                            <Plus size={16} /> 新增商品
                        </button>
                    </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mr-2">
                        <Filter size={16} />
                        <span className="font-medium">筛选</span>
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-2 flex-grow md:flex-grow-0">
                        <div className="relative min-w-[140px]">
                            <select
                                value={filters.category}
                                onChange={e => setFilters({ category: e.target.value, subCategory: '' })}
                                className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                            >
                                <option value="">全部分类</option>
                                {categories.list.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>

                        <div className="relative min-w-[140px]">
                            <select
                                value={filters.subCategory}
                                onChange={e => setFilters({ ...filters, subCategory: e.target.value })}
                                disabled={!filters.category}
                                className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="">全部子分类</option>
                                {filters.category && categories.subs.get(filters.category) &&
                                    Array.from(categories.subs.get(filters.category)!).sort().map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))
                                }
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    <div className="h-6 w-px bg-gray-200 mx-2 hidden md:block"></div>

                    {/* Sorting Controls */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleSort('price')}
                            className={`px-3 py-2 rounded-lg text-sm border flex items-center gap-1 transition-colors ${sortField === 'price' && sortOrder ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                        >
                            价格 {sortField === 'price' && sortOrder && <ArrowUpDown size={12} className={sortOrder === 'desc' ? 'rotate-180' : ''} />}
                        </button>

                        <button
                            onClick={() => handleSort('stock')}
                            className={`px-3 py-2 rounded-lg text-sm border flex items-center gap-1 transition-colors ${sortField === 'stock' && sortOrder ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                        >
                            库存 {sortField === 'stock' && sortOrder && <ArrowUpDown size={12} className={sortOrder === 'desc' ? 'rotate-180' : ''} />}
                        </button>
                    </div>

                    <div className="relative flex-1 min-w-[200px] ml-auto">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="搜索..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pr-1 pb-10">
                <div className="flex flex-col gap-3">
                    {filteredAndSortedProducts.map((p) => (
                        <div key={p.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group flex items-start gap-4">
                            {/* Product Info Section */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-gray-900 text-base line-clamp-1" title={p.title}>
                                                {p.title}
                                            </h3>
                                            <CategoryBadge c={p.category} s={p.subCategory} />
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span className="font-mono">ID: {p.id}</span>
                                            {p.updatedAt && <span>更新: {new Date(p.updatedAt).toLocaleDateString()}</span>}
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <span className="block font-bold text-lg text-gray-900">￥{p.price.toFixed(2)}</span>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.stock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                                            库存: {p.stock > 999 ? '999+' : p.stock}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                                    {/* Toggles */}
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={(e) => toggleStock(p.id, p.inStock !== false, e)}
                                            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border transition-colors ${p.inStock !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'}`}
                                            title={p.inStock !== false ? "点击下架" : "点击上架"}
                                        >
                                            <div className={`w-1.5 h-1.5 rounded-full ${p.inStock !== false ? 'bg-emerald-500' : 'bg-gray-400'}`}></div>
                                            {p.inStock !== false ? '已上架' : '已下架'}
                                        </button>

                                        <button
                                            onClick={(e) => toggleHot(p.id, !!p.isHot, e)}
                                            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border transition-colors ${p.isHot ? 'bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200 hover:text-orange-500'}`}
                                            title={p.isHot ? "取消热销" : "设为热销"}
                                        >
                                            <Flame size={12} className={p.isHot ? 'fill-orange-500' : 'fill-gray-400'} />
                                            {p.isHot ? '热销中' : '设为热销'}
                                        </button>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => { setEditingProduct(p); setShowEditModal(true); }}
                                            className="p-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors border border-gray-100"
                                            title="编辑"
                                        >
                                            <Edit size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(p.id, e)}
                                            className="p-1.5 bg-gray-50 text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors border border-gray-100"
                                            title="删除"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredAndSortedProducts.length === 0 && (
                        <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                            <div className="flex flex-col items-center gap-3">
                                <Package size={40} className="opacity-20" />
                                <span className="text-sm">没有找到匹配的商品</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showCategoryManager && <CategoryManager />}
            {showEditModal && editingProduct && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowEditModal(false)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="font-bold text-xl text-gray-900">{editingProduct.id ? '编辑商品' : '发布新商品'}</h3>
                                <p className="text-sm text-gray-500 mt-1">完善商品详情信息</p>
                            </div>
                            <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-thin">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <section>
                                        <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                            <Package size={16} className="text-indigo-600" /> 基本信息
                                        </h4>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">商品名称 <span className="text-red-500">*</span></label>
                                                <input
                                                    type="text"
                                                    value={editingProduct.title || ''}
                                                    onChange={e => setEditingProduct({ ...editingProduct, title: e.target.value })}
                                                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder-gray-300"
                                                    placeholder="输入商品名称"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">商品描述</label>
                                                <textarea
                                                    value={editingProduct.description || ''}
                                                    onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                                                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder-gray-300 min-h-[120px]"
                                                    placeholder="简要描述商品特点..."
                                                    rows={4}
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    <section>
                                        <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                            <Layers size={16} className="text-indigo-600" /> 分类与库存
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">一级分类 <span className="text-red-500">*</span></label>
                                                <input
                                                    list="category-options"
                                                    type="text"
                                                    value={editingProduct.category || ''}
                                                    onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                                                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                                    placeholder="选择或输入"
                                                    required
                                                />
                                                <datalist id="category-options">
                                                    {categories.list.map(c => <option key={c} value={c} />)}
                                                </datalist>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">二级分类</label>
                                                <input
                                                    list="subcategory-options"
                                                    type="text"
                                                    value={editingProduct.subCategory || ''}
                                                    onChange={e => setEditingProduct({ ...editingProduct, subCategory: e.target.value })}
                                                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                                    placeholder="选择或输入"
                                                />
                                                <datalist id="subcategory-options">
                                                    {editingProduct.category && categories.subs.get(editingProduct.category) &&
                                                        Array.from(categories.subs.get(editingProduct.category)!).map(s => <option key={s} value={s} />)
                                                    }
                                                </datalist>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 mt-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">价格 (￥) <span className="text-red-500">*</span></label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-sans">￥</span>
                                                    <input
                                                        type="number"
                                                        value={editingProduct.price || ''}
                                                        onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })}
                                                        className="w-full border border-gray-200 rounded-lg pl-8 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">库存数量</label>
                                                <input
                                                    type="number"
                                                    value={editingProduct.stock || ''}
                                                    onChange={e => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) })}
                                                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 mt-4">
                                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200">
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${editingProduct.isHot ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={editingProduct.isHot || false}
                                                        onChange={e => setEditingProduct({ ...editingProduct, isHot: e.target.checked })}
                                                        className="hidden"
                                                    />
                                                    {editingProduct.isHot && <Check size={12} className="text-white" />}
                                                </div>
                                                <span className="font-medium">设为热销商品</span>
                                            </label>
                                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200">
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${editingProduct.inStock !== false ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-gray-300'}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={editingProduct.inStock !== false}
                                                        onChange={e => setEditingProduct({ ...editingProduct, inStock: e.target.checked })}
                                                        className="hidden"
                                                    />
                                                    {editingProduct.inStock !== false && <Check size={12} className="text-white" />}
                                                </div>
                                                <span className="font-medium">上架销售</span>
                                            </label>
                                        </div>
                                    </section>
                                </div>

                                <div className="space-y-6">
                                    <section>
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                                <Settings size={16} className="text-indigo-600" /> 商品特性 (Features)
                                            </h4>
                                            <button
                                                type="button"
                                                onClick={addFeature}
                                                className="text-xs flex items-center gap-1 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md transition-colors"
                                            >
                                                <Plus size={12} /> 添加特性
                                            </button>
                                        </div>
                                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                            {(editingProduct.features || []).map((feature, idx) => (
                                                <div key={idx} className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={feature}
                                                        onChange={e => updateFeature(idx, e.target.value)}
                                                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                                                        placeholder={`特性 #${idx + 1}`}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFeature(idx)}
                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                            {(!editingProduct.features || editingProduct.features.length === 0) && (
                                                <div className="text-center py-8 bg-gray-50 border border-dashed border-gray-200 rounded-lg text-gray-400 text-xs">
                                                    暂无特性，点击上方按钮添加
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    <section>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">图片 URL</label>
                                            <input
                                                type="url"
                                                value={editingProduct.image_url || ''}
                                                onChange={e => setEditingProduct({ ...editingProduct, image_url: e.target.value })}
                                                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-gray-500"
                                                placeholder="https://..."
                                            />
                                            {editingProduct.image_url && (
                                                <div className="mt-3 aspect-video rounded-lg bg-gray-100 border border-gray-200 overflow-hidden relative group">
                                                    <img src={editingProduct.image_url} alt="Reference" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="text-white text-xs font-medium">预览图</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-6 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
                                >
                                    <Save size={18} />
                                    {editingProduct.id ? '保存更改' : '立即发布'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
