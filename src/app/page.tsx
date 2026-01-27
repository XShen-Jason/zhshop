'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ShoppingBag, BookOpen, Users, Gift, ArrowRight, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Product, Tutorial, GroupBuy, Lottery } from '@/types';

export default function HomePage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [tutorials, setTutorials] = useState<Tutorial[]>([]);
    const [groups, setGroups] = useState<GroupBuy[]>([]);
    const [lotteries, setLotteries] = useState<Lottery[]>([]);
    const [loading, setLoading] = useState(true);
    const [productCategory, setProductCategory] = useState('全部');

    const fetchingRef = useRef(false);

    const fetchData = useCallback(async () => {
        if (fetchingRef.current) return;
        fetchingRef.current = true;

        try {
            // Use limit params to reduce data transfer - only fetch what we need
            const [productsRes, tutorialsRes, groupsRes, lotteriesRes] = await Promise.all([
                fetch('/api/products?limit=8'),   // Display max 8 products
                fetch('/api/tutorials?limit=2'),  // Display max 2 tutorials
                fetch('/api/groups?limit=6'),     // Display max 3, but need buffer for filtering
                fetch('/api/lottery?limit=6')     // Display max 3, but need buffer for filtering
            ]);

            if (productsRes.ok) setProducts(await productsRes.json());
            if (tutorialsRes.ok) setTutorials(await tutorialsRes.json());
            if (groupsRes.ok) setGroups(await groupsRes.json());
            if (lotteriesRes.ok) setLotteries(await lotteriesRes.json());
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
            fetchingRef.current = false;
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const categories = ['全部', ...Array.from(new Set(products.map(p => p.category)))];

    const isAvailable = (p: Product) => {
        if (!p.inStock) return false;
        if (typeof p.stock === 'number' && p.stock <= 0) return false;
        return true;
    };

    // Sort: available first
    const filteredProducts = (productCategory === '全部' ? products : products.filter(p => p.category === productCategory))
        .sort((a, b) => {
            const aAvail = isAvailable(a);
            const bAvail = isAvailable(b);
            if (aAvail === bAvail) return 0;
            return aAvail ? -1 : 1;
        });

    // Active groups (进行中 first)
    const activeGroups = groups
        .filter(g => g.status !== '已结束')
        .sort((a, b) => (a.status === '进行中' ? -1 : 1))
        .slice(0, 3);

    // Active lotteries (待开奖 first)
    const activeLotteries = lotteries
        .filter(l => l.status === '待开奖')
        .slice(0, 3);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
            {/* Hero Banner */}
            <section className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-white via-indigo-50/50 to-purple-50/50">
                <div className="p-8 md:p-10 flex flex-col md:flex-row justify-between items-center">
                    <div className="max-w-xl">
                        <h1 className="text-3xl md:text-4xl font-extrabold mb-3 text-gray-900">
                            探索数字资产的<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">无限可能</span>
                        </h1>
                        <p className="text-gray-600 mb-5">一站式数字商品交易平台，提供优质教程、拼车合租与积分抽奖服务。</p>
                        <div className="flex gap-3">
                            <Link href="/products" className="bg-indigo-600 text-white px-6 py-2.5 rounded-full font-bold shadow hover:bg-indigo-700 transition flex items-center">
                                浏览商店 <ShoppingBag size={16} className="ml-2" />
                            </Link>
                            <a href="https://t.me/your_telegram_group" target="_blank" rel="noreferrer" className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-full font-bold hover:bg-gray-50 transition flex items-center">
                                加入社群 <Users size={16} className="ml-2" />
                            </a>
                        </div>
                    </div>
                    <Gift size={100} className="hidden md:block text-indigo-200" strokeWidth={0.8} />
                </div>
            </section>

            {/* Row 1: Groups + Lotteries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Groups Section */}
                <section className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center">
                            <Users size={18} className="mr-2 text-green-600" /> 拼团
                        </h2>
                        <Link href="/groups" className="text-sm text-indigo-600 hover:underline flex items-center">
                            全部 <ArrowRight size={14} className="ml-1" />
                        </Link>
                    </div>
                    <div className="p-4 space-y-3">
                        {activeGroups.map(g => (
                            <Link key={g.id} href={`/groups/${g.id}`}>
                                <div className="p-3 rounded-lg border border-gray-100 hover:border-green-200 hover:bg-green-50/30 transition">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-gray-800 text-sm line-clamp-1">{g.title}</h3>
                                        <Badge status={g.status} />
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-gray-500">
                                        <span>¥{g.price}</span>
                                        <span className="text-green-600 font-medium">{g.currentCount}/{g.targetCount} 人</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                        {activeGroups.length === 0 && <p className="text-gray-400 text-sm text-center py-6">暂无进行中的拼团</p>}
                    </div>
                </section>

                {/* Lotteries Section */}
                <section className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center">
                            <Gift size={18} className="mr-2 text-amber-500" /> 抽奖
                        </h2>
                        <Link href="/lottery" className="text-sm text-indigo-600 hover:underline flex items-center">
                            全部 <ArrowRight size={14} className="ml-1" />
                        </Link>
                    </div>
                    <div className="p-4 space-y-3">
                        {activeLotteries.map(l => (
                            <Link key={l.id} href={`/lottery/${l.id}`}>
                                <div className="p-3 rounded-lg border border-gray-100 hover:border-amber-200 hover:bg-amber-50/30 transition">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-gray-800 text-sm line-clamp-1">{l.title}</h3>
                                        <Badge status={l.status} />
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-gray-500">
                                        <span className="flex items-center"><Clock size={12} className="mr-1" />{l.drawDate?.split('T')[0]}</span>
                                        <span>{l.entryCost} 积分</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                        {activeLotteries.length === 0 && <p className="text-gray-400 text-sm text-center py-6">暂无待开奖的抽奖</p>}
                    </div>
                </section>
            </div>

            {/* Row 2: Products (Full Width) */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center">
                        <ShoppingBag size={20} className="mr-2 text-indigo-600" /> 商品
                    </h2>
                    <Link href="/products" className="text-sm text-indigo-600 hover:underline flex items-center">
                        全部 <ArrowRight size={14} className="ml-1" />
                    </Link>
                </div>
                {/* Category Tabs */}
                <div className="px-5 py-3 border-b border-gray-50 flex gap-3 overflow-x-auto">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setProductCategory(cat)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${productCategory === cat ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                {/* Product Grid */}
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {filteredProducts.slice(0, 8).map(p => (
                        <Link key={p.id} href={`/products/${p.id}`}>
                            <Card className="group h-full">
                                <div className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-gray-800 group-hover:text-indigo-600 transition line-clamp-1">{p.title}</h3>
                                        <Badge status={isAvailable(p) ? '有货' : '无货'} />
                                    </div>
                                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">{p.description}</p>
                                    <div className="flex justify-between items-center">
                                        <span className="text-lg font-bold text-gray-900">¥{p.price}</span>
                                        {typeof p.stock === 'number' && <span className="text-xs text-gray-400">库存: {p.stock}</span>}
                                    </div>
                                </div>
                            </Card>
                        </Link>
                    ))}
                    {filteredProducts.length === 0 && (
                        <div className="col-span-4 text-center text-gray-400 py-10">暂无商品</div>
                    )}
                </div>
            </section>

            {/* Row 3: Tutorials (2 items) */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center">
                        <BookOpen size={20} className="mr-2 text-blue-600" /> 最新教程
                    </h2>
                    <Link href="/tutorials" className="text-sm text-indigo-600 hover:underline flex items-center">
                        全部 <ArrowRight size={14} className="ml-1" />
                    </Link>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                    {tutorials.slice(0, 2).map(t => (
                        <Link key={t.id} href={`/tutorials/${t.id}`}>
                            <div className="p-5 rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition h-full">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded">{t.category}</span>
                                </div>
                                <h3 className="font-bold text-lg text-gray-800 mb-2 line-clamp-1">{t.title}</h3>
                                <p className="text-sm text-gray-500 line-clamp-2">{t.summary}</p>
                            </div>
                        </Link>
                    ))}
                    {tutorials.length === 0 && <p className="col-span-2 text-gray-400 text-center py-10">暂无教程</p>}
                </div>
            </section>
        </div>
    );
}
