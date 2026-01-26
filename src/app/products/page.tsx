'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Product } from '@/types';

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('全部');

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

    // Check if product is available (inStock AND stock > 0, or stock not set)
    const isAvailable = (p: Product) => {
        if (!p.inStock) return false;
        // If stock is defined and is 0 or less, not available
        if (typeof p.stock === 'number' && p.stock <= 0) return false;
        return true;
    };

    // Filter and sort: available products first
    const filteredProducts = (filter === '全部' ? products : products.filter(p => p.category === filter))
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
        <div className="p-6 max-w-7xl mx-auto min-h-screen">
            <div className="mb-10 text-center">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2">精选商店</h2>
                <p className="text-gray-500">发现最优质的数字服务与产品</p>
            </div>

            {/* Filter */}
            <div className="flex justify-center gap-3 mb-10 flex-wrap">
                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setFilter(cat)}
                        className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${filter === cat ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProducts.map(p => (
                    <Card key={p.id} className="flex flex-col">
                        <div className="p-6 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full font-bold">{p.category}</div>
                                <div className="flex items-center gap-2">
                                    {p.stock !== undefined && p.stock > 0 && (
                                        <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-700">库存: {p.stock}</span>
                                    )}
                                    <Badge status={isAvailable(p) ? '有货' : '无货'} className={isAvailable(p) ? '' : 'bg-gray-100 text-gray-500'} />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{p.title}</h3>
                            <p className="text-gray-500 text-sm mb-6 leading-relaxed flex-1">{p.description}</p>

                            <div className="bg-gray-50 rounded-xl p-4 mb-6">
                                <ul className="text-sm text-gray-600 space-y-2">
                                    {(p.features || []).slice(0, 3).map((f, i) => (
                                        <li key={i} className="flex items-center"><CheckCircle size={14} className="mr-2 text-green-500 flex-shrink-0" /> {f}</li>
                                    ))}
                                </ul>
                            </div>

                            {isAvailable(p) ? (
                                <Link
                                    href={`/products/${p.id}`}
                                    className="w-full bg-indigo-600 text-white py-3.5 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all font-bold active:scale-95 flex items-center justify-center"
                                >
                                    立即购买 <span className="ml-2 opacity-80 text-sm font-normal">| ¥{p.price}</span>
                                </Link>
                            ) : (
                                <button
                                    disabled
                                    className="w-full bg-gray-200 text-gray-400 py-3.5 rounded-xl cursor-not-allowed font-bold flex items-center justify-center"
                                >
                                    暂时缺货 <span className="ml-2 opacity-80 text-sm font-normal">| ¥{p.price}</span>
                                </button>
                            )}
                        </div>
                    </Card>
                ))}
            </div>

            {filteredProducts.length === 0 && (
                <div className="text-center py-20 text-gray-500">
                    暂无商品
                </div>
            )}
        </div>
    );
}
