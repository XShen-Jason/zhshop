'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Loader2, Save, Upload, Image as ImageIcon, Users } from 'lucide-react';
import { useToast } from '@/lib/GlobalToast';
import type { SiteConfig, TransactionStats } from './_shared/types';

export default function AdminOverviewPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        pendingOrders: 0,
        totalProducts: 0,
        activeGroups: 0,
        pendingLotteries: 0
    });
    const [transactionStats, setTransactionStats] = useState<TransactionStats>({
        todayRevenue: 0,
        yesterdayRevenue: 0,
        monthlyRevenue: 0,
        monthlyOrderCount: 0,
        activeGroupsCount: 0,
        lockedGroupsCount: 0,
        endedGroupsCount: 0,
        totalEndedGroupSales: 0
    });
    const [siteConfig, setSiteConfig] = useState<SiteConfig>({
        telegram_link: '',
        qq_group_link: '',
        official_email: '',
        friend_links: '',
        footer_copyright: '',
        footer_qr_image: '',
        footer_qr_title: ''
    });
    const [siteConfigLoading, setSiteConfigLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);

        // Helper to fetch and update state independently
        const fetchResource = async (url: string, onSuccess: (data: any) => void) => {
            try {
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    onSuccess(data);
                }
            } catch (error) {
                console.error(`Failed to fetch ${url}`, error);
            }
        };

        const promises = [
            fetchResource('/api/orders', (orders) => {
                setStats(prev => ({ ...prev, pendingOrders: orders.filter((o: { status: string }) => o.status === '待联系').length }));
            }),
            fetchResource('/api/products', (products) => {
                setStats(prev => ({ ...prev, totalProducts: products.length }));
            }),
            // fetchResource('/api/groups', (groups) => {
            //     setStats(prev => ({ ...prev, activeGroups: groups.filter((g: { status: string }) => g.status === '进行中').length }));
            // }),
            fetchResource('/api/lottery', (lotteries) => {
                setStats(prev => ({ ...prev, pendingLotteries: lotteries.filter((l: { status: string }) => l.status === '待开奖').length }));
            }),
            fetchResource('/api/admin/stats', (data) => {
                setTransactionStats(prev => ({ ...prev, ...data })); // Merge to be safe
            }),
            fetchResource('/api/site-config', (config) => {
                setSiteConfig(config);
            })
        ];

        await Promise.allSettled(promises);
        setLoading(false);
    };

    const handleSaveConfig = async () => {
        setSiteConfigLoading(true);
        try {
            const res = await fetch('/api/site-config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(siteConfig)
            });
            if (res.ok) showToast('网站配置已保存', 'success');
            else showToast('保存失败', 'error');
        } catch {
            showToast('保存失败', 'error');
        } finally {
            setSiteConfigLoading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setSiteConfig(prev => ({ ...prev, footer_qr_image: data.url }));
                showToast('上传成功', 'success');
            } else {
                showToast('上传失败', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('上传出错', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">后台总览</h1>
                    <p className="text-sm text-gray-500 mt-1">欢迎回来，查看今日运营数据的完整概览</p>
                </div>
                <div className="text-sm text-gray-500 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100">
                    {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                </div>
            </div>

            {/* Transaction Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl shadow-lg shadow-emerald-200 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Settings size={64} />
                    </div>
                    <p className="text-emerald-100 text-sm font-medium mb-1">今日交易额</p>
                    <h3 className="text-3xl font-bold">￥{transactionStats.todayRevenue.toFixed(2)}</h3>
                    <div className="mt-4 text-xs text-emerald-100 bg-emerald-600/30 inline-block px-2 py-1 rounded">
                        昨日: ￥{transactionStats.yesterdayRevenue.toFixed(2)}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm font-medium mb-1">本月总额</p>
                            <h3 className="text-2xl font-bold text-gray-900">￥{transactionStats.monthlyRevenue.toFixed(2)}</h3>
                        </div>
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <Settings size={20} />
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-50 flex items-center text-xs text-gray-500">
                        <span className="text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded mr-2">OK</span>
                        本月订单数: {transactionStats.monthlyOrderCount}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm font-medium mb-1">待处理订单</p>
                            <h3 className="text-2xl font-bold text-amber-500">{stats.pendingOrders}</h3>
                        </div>
                        <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                            <Loader2 size={20} />
                        </div>
                    </div>
                    <p className="mt-4 pt-4 border-t border-gray-50 text-xs text-gray-400">需要尽快联系发货</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                            <p className="text-gray-500 text-sm font-medium mb-2">拼团统计</p>
                            <div className="flex items-center gap-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-purple-600">{transactionStats.activeGroupsCount || 0}</h3>
                                    <p className="text-xs text-purple-400 font-medium">进行中</p>
                                </div>
                                <div className="w-px h-8 bg-gray-100"></div>
                                <div>
                                    <h3 className="text-2xl font-bold text-amber-500">{transactionStats.lockedGroupsCount || 0}</h3>
                                    <p className="text-xs text-amber-400 font-medium">已锁团</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                            <Users size={20} />
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-50 text-xs text-gray-500 flex flex-col gap-1">
                        <div className="flex justify-between">
                            <span>已结束拼团:</span>
                            <span className="font-medium">{transactionStats.endedGroupsCount || 0}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>已成团金额:</span>
                            <span className="font-medium text-emerald-600">￥{(transactionStats.totalEndedGroupSales || 0).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Operational Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-500">商品总数</p>
                        <p className="text-lg font-bold text-gray-900">{stats.totalProducts}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs">P</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-500">待开奖</p>
                        <p className="text-lg font-bold text-gray-900">{stats.pendingLotteries}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center text-xs">L</div>
                </div>
            </div>


            {/* Site Configuration */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center mb-6 pb-4 border-b border-gray-50">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mr-4">
                        <Settings size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">网站配置</h3>
                        <p className="text-sm text-gray-500">管理站点全局设置、联系方式及页脚信息</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Telegram 群链接</label>
                        <input
                            type="url"
                            value={siteConfig.telegram_link}
                            onChange={e => setSiteConfig({ ...siteConfig, telegram_link: e.target.value })}
                            placeholder="https://t.me/your_group"
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50/50 focus:bg-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">QQ 群号</label>
                        <input
                            type="text"
                            value={siteConfig.qq_group_link}
                            onChange={e => setSiteConfig({ ...siteConfig, qq_group_link: e.target.value })}
                            placeholder="123456789"
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50/50 focus:bg-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">官方邮箱</label>
                        <input
                            type="text"
                            value={siteConfig.official_email}
                            onChange={e => setSiteConfig({ ...siteConfig, official_email: e.target.value })}
                            placeholder="support@example.com"
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50/50 focus:bg-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">页脚版权文字</label>
                        <input
                            type="text"
                            value={siteConfig.footer_copyright}
                            onChange={e => setSiteConfig({ ...siteConfig, footer_copyright: e.target.value })}
                            placeholder="© 2026 智汇商城 版权所有"
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50/50 focus:bg-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">二维码图片</label>
                        <div className="flex items-center gap-4">
                            <div className="relative w-20 h-20 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden group hover:border-indigo-300 transition-colors">
                                {siteConfig.footer_qr_image ? (
                                    <img src={siteConfig.footer_qr_image} alt="" className="w-full h-full object-contain" />
                                ) : (
                                    <ImageIcon size={24} className="text-gray-300" />
                                )}
                            </div>
                            <div className="flex-1">
                                <label className="cursor-pointer bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 hover:text-indigo-600 inline-flex items-center transition-all shadow-sm">
                                    <Upload size={16} className="mr-2" />
                                    {isUploading ? '上传中...' : '点击上传图片'}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        disabled={isUploading}
                                        onChange={handleImageUpload}
                                    />
                                </label>
                                <p className="text-xs text-gray-400 mt-2">支持 JPG, PNG 格式，建议尺寸 200x200</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">二维码标题</label>
                        <input
                            type="text"
                            value={siteConfig.footer_qr_title}
                            onChange={e => setSiteConfig({ ...siteConfig, footer_qr_title: e.target.value })}
                            placeholder="扫码加群"
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50/50 focus:bg-white"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">友情链接 (名称|链接 每行一个)</label>
                        <textarea
                            value={siteConfig.friend_links}
                            onChange={e => setSiteConfig({ ...siteConfig, friend_links: e.target.value })}
                            placeholder="Google|https://google.com&#10;Baidu|https://baidu.com"
                            rows={3}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50/50 focus:bg-white font-mono"
                        />
                    </div>
                </div>
                <div className="flex justify-end pt-6 mt-6 border-t border-gray-50">
                    <button
                        onClick={handleSaveConfig}
                        disabled={siteConfigLoading}
                        className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02]"
                    >
                        {siteConfigLoading ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save size={18} className="mr-2" />}
                        保存配置
                    </button>
                </div>
            </div>
        </div>
    );
}
