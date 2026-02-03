'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ShoppingBag, BookOpen, Users, Gift, ArrowRight, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Product, Tutorial, GroupBuy, Lottery } from '@/types';

interface SiteConfig {
    telegram_link?: string;
}

export default function HomePage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [tutorials, setTutorials] = useState<Tutorial[]>([]);
    const [groups, setGroups] = useState<GroupBuy[]>([]);
    const [lotteries, setLotteries] = useState<Lottery[]>([]);
    const [siteConfig, setSiteConfig] = useState<SiteConfig>({});
    const [loading, setLoading] = useState(true);
    const [productCategory, setProductCategory] = useState('全部');
    const [productSubCategory, setProductSubCategory] = useState('全部');

    const fetchingRef = useRef(false);

    const fetchData = useCallback(async () => {
        if (fetchingRef.current) return;
        fetchingRef.current = true;

        try {
            // Use limit params to reduce data transfer - only fetch what we need
            // Products need more for category filtering on frontend
            const [productsRes, tutorialsRes, groupsRes, lotteriesRes, configRes] = await Promise.all([
                fetch('/api/products?limit=50'),  // Need more for category filtering (frontend filtered)
                fetch('/api/tutorials?limit=2'),  // Display max 2 tutorials
                fetch('/api/groups?limit=6'),     // Display max 3, but need buffer for filtering
                fetch('/api/lottery?limit=6'),    // Display max 3, but need buffer for filtering
                fetch('/api/site-config')         // Site configuration
            ]);

            if (productsRes.ok) setProducts(await productsRes.json());
            if (tutorialsRes.ok) setTutorials(await tutorialsRes.json());
            if (groupsRes.ok) setGroups(await groupsRes.json());
            if (lotteriesRes.ok) setLotteries(await lotteriesRes.json());
            if (configRes.ok) setSiteConfig(await configRes.json());
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
    // Show all subcategories when '全部' is selected, otherwise filter by category
    const subCategories = productCategory === '全部'
        ? ['全部', ...Array.from(new Set(products.map(p => p.subCategory).filter(Boolean) as string[]))]
        : ['全部', ...Array.from(new Set(products.filter(p => p.category === productCategory).map(p => p.subCategory).filter(Boolean) as string[]))];

    const isAvailable = (p: Product) => {
        if (!p.inStock) return false;
        if (typeof p.stock === 'number' && p.stock <= 0) return false;
        return true;
    };

    // Sort: available first
    const filteredProducts = products
        .filter(p => {
            if (productCategory !== '全部' && p.category !== productCategory) return false;
            if (productSubCategory !== '全部' && p.subCategory !== productSubCategory) return false;
            return true;
        })
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
        <div className="max-w-7xl mx-auto px-4 py-4 md:py-8 space-y-4 md:space-y-8">
            {/* Hero Banner */}
            <section className="relative overflow-hidden rounded-xl md:rounded-2xl border border-gray-200 bg-gradient-to-br from-white via-indigo-50/50 to-purple-50/50">
                <div className="p-5 md:p-10 flex flex-col md:flex-row justify-between items-center">
                    <div className="max-w-xl">
                        <h1 className="text-xl md:text-4xl font-extrabold mb-2 md:mb-3 text-gray-900">
                            探索数字资产的<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">无限可能</span>
                        </h1>
                        <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-5">一站式数字商品交易平台，提供优质教程、拼车合租与积分抽奖服务。</p>
                        <div className="flex flex-wrap gap-2 md:gap-3">
                            <Link href="/products" className="bg-indigo-600 text-white px-4 md:px-6 py-2 md:py-2.5 rounded-full text-sm md:text-base font-bold shadow hover:bg-indigo-700 transition flex items-center">
                                浏览商店 <ShoppingBag size={14} className="ml-1.5 md:ml-2 md:w-4 md:h-4" />
                            </Link>
                            {siteConfig.telegram_link && (
                                <a href={siteConfig.telegram_link} target="_blank" rel="noreferrer" className="bg-white border border-gray-200 text-gray-700 px-4 md:px-6 py-2 md:py-2.5 rounded-full text-sm md:text-base font-bold hover:bg-gray-50 transition flex items-center">
                                    加入社群 <Users size={14} className="ml-1.5 md:ml-2 md:w-4 md:h-4" />
                                </a>
                            )}
                        </div>
                    </div>
                    <Gift size={100} className="hidden md:block text-indigo-200" strokeWidth={0.8} />
                </div>
            </section>

            {/* Row 1: Groups + Lotteries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                {/* Groups Section */}
                <section className="bg-white rounded-xl md:rounded-2xl border border-gray-100 shadow-sm">
                    <div className="p-3 md:p-4 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="text-base md:text-lg font-bold text-gray-900 flex items-center">
                            <Users size={16} className="mr-1.5 md:mr-2 text-green-600 md:w-[18px] md:h-[18px]" /> 拼团
                        </h2>
                        <Link href="/groups" className="text-xs md:text-sm text-indigo-600 hover:underline flex items-center">
                            全部 <ArrowRight size={12} className="ml-0.5 md:ml-1 md:w-3.5 md:h-3.5" />
                        </Link>
                    </div>
                    <div className="p-3 md:p-4 space-y-2 md:space-y-3">
                        {activeGroups.map(g => (
                            <Link key={g.id} href={`/groups/${g.id}`}>
                                <div className="p-2.5 md:p-3 rounded-lg border border-gray-100 hover:border-green-200 hover:bg-green-50/30 transition">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-gray-800 text-xs md:text-sm line-clamp-1">{g.title}</h3>
                                        <Badge status={g.status} className="text-[10px] md:text-xs" />
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] md:text-xs text-gray-500">
                                        <span>￥{g.price}</span>
                                        <span className="text-green-600 font-medium">{g.currentCount}/{g.targetCount} 人</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                        {activeGroups.length === 0 && <p className="text-gray-400 text-xs md:text-sm text-center py-4 md:py-6">暂无进行中的拼团</p>}
                    </div>
                </section>

                {/* Lotteries Section */}
                <section className="bg-white rounded-xl md:rounded-2xl border border-gray-100 shadow-sm">
                    <div className="p-3 md:p-4 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="text-base md:text-lg font-bold text-gray-900 flex items-center">
                            <Gift size={16} className="mr-1.5 md:mr-2 text-amber-500 md:w-[18px] md:h-[18px]" /> 抽奖
                        </h2>
                        <Link href="/lottery" className="text-xs md:text-sm text-indigo-600 hover:underline flex items-center">
                            全部 <ArrowRight size={12} className="ml-0.5 md:ml-1 md:w-3.5 md:h-3.5" />
                        </Link>
                    </div>
                    <div className="p-3 md:p-4 space-y-2 md:space-y-3">
                        {activeLotteries.map(l => (
                            <Link key={l.id} href={`/lottery/${l.id}`}>
                                <div className="p-2.5 md:p-3 rounded-lg border border-gray-100 hover:border-amber-200 hover:bg-amber-50/30 transition">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-gray-800 text-xs md:text-sm line-clamp-1">{l.title}</h3>
                                        <div className="flex gap-1">
                                            {l.hasEntered && <Badge status="已参与" className="bg-green-100 text-green-700 border-green-200 text-[10px] md:text-xs" />}
                                            <Badge status={l.status} className="text-[10px] md:text-xs" />
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] md:text-xs text-gray-500">
                                        <span className="flex items-center"><Clock size={10} className="mr-0.5 md:mr-1 md:w-3 md:h-3" />{l.drawDate?.split('T')[0]}</span>
                                        <span>{l.entryCost} 积分</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                        {activeLotteries.length === 0 && <p className="text-gray-400 text-xs md:text-sm text-center py-4 md:py-6">暂无待开奖的抽奖</p>}
                    </div>
                </section>
            </div>

            {/* Row 2: Products (Full Width) */}
            <section className="bg-white rounded-xl md:rounded-2xl border border-gray-100 shadow-sm">
                <div className="p-3 md:p-5 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-base md:text-xl font-bold text-gray-900 flex items-center">
                        <ShoppingBag size={16} className="mr-1.5 md:mr-2 text-indigo-600 md:w-5 md:h-5" /> 商品
                    </h2>
                    <Link href="/products" className="text-xs md:text-sm text-indigo-600 hover:underline flex items-center">
                        全部 <ArrowRight size={12} className="ml-0.5 md:ml-1 md:w-3.5 md:h-3.5" />
                    </Link>
                </div>
                {/* Enhanced Category Tabs */}
                <div className="flex flex-col border-b border-gray-100 bg-gray-50/50 rounded-t-xl overflow-hidden">
                    {/* Main Categories */}
                    <div className="px-3 md:px-5 py-2 md:py-3 flex gap-2 md:gap-4 overflow-x-auto hide-scrollbar">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => { setProductCategory(cat); setProductSubCategory('全部'); }}
                                className={`relative px-1.5 md:px-2 py-1.5 md:py-2 text-xs md:text-sm font-bold whitespace-nowrap transition-colors ${productCategory === cat
                                    ? 'text-indigo-600'
                                    : 'text-gray-500 hover:text-gray-800'
                                    }`}
                            >
                                {cat}
                                {productCategory === cat && (
                                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-full animate-fade-in" />
                                )}
                            </button>
                        ))}
                    </div>
                    {/* Sub Categories */}
                    {subCategories.length > 1 && (
                        <div className="px-3 md:px-5 pb-2 md:pb-3 flex gap-1.5 md:gap-2 overflow-x-auto hide-scrollbar animate-fade-in">
                            {subCategories.map(sub => (
                                <button
                                    key={sub}
                                    onClick={() => setProductSubCategory(sub)}
                                    className={`px-2.5 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-medium whitespace-nowrap transition-all border ${productSubCategory === sub
                                        ? 'bg-white border-indigo-200 text-indigo-700 shadow-sm'
                                        : 'bg-transparent border-transparent text-gray-500 hover:bg-white hover:text-gray-700'
                                        }`}
                                >
                                    {sub}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Product Grid - 2 columns on mobile, 4 on large */}
                <div className="p-3 md:p-5 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-5">
                    {filteredProducts.slice(0, 8).map(p => (
                        <Link key={p.id} href={`/products/${p.id}`}>
                            <Card className="group h-full flex flex-col hover:shadow-lg transition-all duration-300 border-transparent hover:border-indigo-100">
                                <div className="p-2.5 md:p-4 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start gap-1 md:gap-2 mb-1.5 md:mb-2">
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <h3 className="font-bold text-xs md:text-base text-gray-800 group-hover:text-indigo-600 transition truncate">{p.title}</h3>
                                            {(p.subCategory) && <span className="text-[9px] md:text-[10px] text-gray-400 font-medium truncate">{p.subCategory}</span>}
                                        </div>
                                        <Badge status={isAvailable(p) ? '有货' : '无货'} className={`shrink-0 whitespace-nowrap text-[9px] md:text-xs ${isAvailable(p) ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-400'}`} />
                                    </div>
                                    <p className="hidden md:block text-xs text-gray-500 line-clamp-2 mb-3 mt-1 flex-1">{p.description}</p>
                                    <div className="flex justify-between items-center mt-auto pt-2 md:pt-3 border-t border-gray-50">
                                        <span className="text-sm md:text-lg font-bold text-gray-900">￥{p.price}</span>
                                        {typeof p.stock === 'number' && <span className="hidden md:inline text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">库存: {p.stock}</span>}
                                    </div>
                                </div>
                            </Card>
                        </Link>
                    ))}
                    {filteredProducts.length === 0 && (
                        <div className="col-span-2 md:col-span-4 text-center text-gray-400 text-sm py-6 md:py-10">暂无商品</div>
                    )}
                </div>
            </section>

            {/* Row 3: Tutorials (2 items) */}
            <section className="bg-white rounded-xl md:rounded-2xl border border-gray-100 shadow-sm">
                <div className="p-3 md:p-5 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-base md:text-xl font-bold text-gray-900 flex items-center">
                        <BookOpen size={16} className="mr-1.5 md:mr-2 text-blue-600 md:w-5 md:h-5" /> 最新教程
                    </h2>
                    <Link href="/tutorials" className="text-xs md:text-sm text-indigo-600 hover:underline flex items-center">
                        全部 <ArrowRight size={12} className="ml-0.5 md:ml-1 md:w-3.5 md:h-3.5" />
                    </Link>
                </div>
                <div className="p-3 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
                    {tutorials.slice(0, 2).map(t => (
                        <Link key={t.id} href={`/tutorials/${t.id}`}>
                            <div className="p-3 md:p-5 rounded-lg md:rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition h-full">
                                <div className="flex items-center gap-2 mb-2 md:mb-3">
                                    <span className="text-[10px] md:text-xs font-bold bg-blue-50 text-blue-600 px-1.5 md:px-2 py-0.5 md:py-1 rounded">{t.category}</span>
                                </div>
                                <h3 className="font-bold text-sm md:text-lg text-gray-800 mb-1 md:mb-2 line-clamp-1">{t.title}</h3>
                                <p className="text-xs md:text-sm text-gray-500 line-clamp-2">{t.summary}</p>
                            </div>
                        </Link>
                    ))}
                    {tutorials.length === 0 && <p className="col-span-2 text-gray-400 text-xs md:text-sm text-center py-6 md:py-10">暂无教程</p>}
                </div>
            </section>
        </div>
    );
}
