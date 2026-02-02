'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ShoppingBag, ArrowRight, CheckCircle, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Product } from '@/types';

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('全部');
    const [subFilter, setSubFilter] = useState('全部');

    // Prevent duplicate fetches (React StrictMode, fast re-renders)
    const fetchingRef = useRef(false);

    const fetchProducts = useCallback(async () => {
        if (fetchingRef.current) return;
        fetchingRef.current = true;

        try {
            const res = await fetch('/api/products');
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
            fetchingRef.current = false;
        }
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const categories = ['全部', ...Array.from(new Set(products.map(p => p.category)))];
    const subCategories = filter === '全部'
        ? []
        : ['全部', ...Array.from(new Set(products.filter(p => p.category === filter).map(p => p.subCategory).filter(Boolean) as string[]))];

    // Check if product is available (inStock AND stock > 0, or stock not set)
    const isAvailable = (p: Product) => {
        if (!p.inStock) return false;
        // If stock is defined and is 0 or less, not available
        if (typeof p.stock === 'number' && p.stock <= 0) return false;
        return true;
    };

    // Filter and sort: available products first
    const filteredProducts = products
        .filter(p => {
            if (filter !== '全部' && p.category !== filter) return false;
            if (subFilter !== '全部' && p.subCategory !== subFilter) return false;
            return true;
        })
        .sort((a, b) => {
            const aAvail = isAvailable(a);
            const bAvail = isAvailable(b);
            if (aAvail === bAvail) return 0;
            return aAvail ? -1 : 1;
        });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto min-h-screen pt-8 pb-12 px-4 sm:px-6">
            <div className="mb-8">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2">精选商店</h2>
                <p className="text-gray-500">发现最优质的数字服务与产品</p>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Filter (Desktop) */}
                <div className="w-full md:w-64 flex-shrink-0 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                        <h3 className="font-bold text-gray-900 mb-4 px-2">商品分类</h3>
                        <div className="space-y-1">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => { setFilter(cat); setSubFilter('全部'); }}
                                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex justify-between items-center group ${filter === cat
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600'
                                        }`}
                                >
                                    {cat}
                                    {filter === cat && <ChevronRight size={16} />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                    {/* Sub Category Filter */}
                    {subCategories.length > 1 && (
                        <div className="mb-6 overflow-x-auto pb-2 -mx-1 px-1">
                            <div className="flex gap-2">
                                {subCategories.map((sub) => (
                                    <button
                                        key={sub}
                                        onClick={() => setSubFilter(sub)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all border ${subFilter === sub
                                            ? 'bg-white border-blue-500 text-blue-600 shadow-sm ring-1 ring-blue-500'
                                            : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
                                            }`}
                                    >
                                        {sub}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredProducts.map(p => (
                            <Card key={p.id} className="flex flex-col group hover:-translate-y-1 transition-all duration-300">
                                <div className="p-5 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex flex-col">
                                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-md font-bold w-fit border border-indigo-100/50">
                                                {p.category}
                                            </div>
                                            {p.subCategory && <div className="text-[10px] text-gray-400 mt-1 ml-0.5 font-medium">{p.subCategory}</div>}
                                        </div>
                                        <Badge status={isAvailable(p) ? '有货' : '无货'} className={isAvailable(p) ? 'shadow-sm' : 'bg-gray-100 text-gray-500'} />
                                    </div>

                                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-1">{p.title}</h3>
                                    <p className="text-gray-500 text-sm mb-5 leading-relaxed flex-1 line-clamp-3">{p.description}</p>

                                    <div className="bg-gray-50/50 rounded-lg p-3 mb-5 border border-gray-100">
                                        <ul className="text-xs text-gray-600 space-y-1.5">
                                            {(p.features || []).slice(0, 2).map((f, i) => (
                                                <li key={i} className="flex items-center"><CheckCircle size={12} className="mr-1.5 text-green-500 flex-shrink-0" /> <span className="truncate">{f}</span></li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-400 mb-0.5">价格</span>
                                            <span className="text-xl font-bold text-gray-900">￥{p.price}</span>
                                        </div>

                                        {isAvailable(p) ? (
                                            <Link
                                                href={`/products/${p.id}`}
                                                className="bg-gray-900 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-600 transition-colors font-medium text-sm shadow-md shadow-gray-200 flex items-center"
                                            >
                                                购买 <ArrowRight size={14} className="ml-1.5" />
                                            </Link>
                                        ) : (
                                            <button disabled className="bg-gray-100 text-gray-400 px-5 py-2.5 rounded-lg text-sm cursor-not-allowed">
                                                缺货
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {filteredProducts.length === 0 && (
                        <div className="bg-gray-50 rounded-xl p-12 text-center">
                            <div className="mx-auto w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4 text-gray-400">
                                <ShoppingBag size={24} />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-1">暂无商品</h3>
                            <p className="text-gray-500">当前分类下暂时没有上架商品</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
