'use client';

import React, { useEffect, useState } from 'react';
import { Save, LayoutTemplate, Link as LinkIcon, Type } from 'lucide-react';

export default function SiteSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState({
        home_banner_title: '',
        home_banner_desc: '',
        home_banner_btn_text: '',
        home_banner_btn_link: ''
    });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/site-config');
            if (res.ok) {
                const data = await res.json();
                setConfig({
                    home_banner_title: data.home_banner_title || '',
                    home_banner_desc: data.home_banner_desc || '',
                    home_banner_btn_text: data.home_banner_btn_text || '',
                    home_banner_btn_link: data.home_banner_btn_link || ''
                });
            }
        } catch (error) {
            console.error('Error fetching config:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/site-config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            if (res.ok) {
                alert('设置已保存');
            } else {
                alert('保存失败');
            }
        } catch (error) {
            console.error('Error saving config:', error);
            alert('保存出错');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">加载中...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">站点设置</h1>
                    <p className="text-sm text-gray-500 mt-1">管理网站的全局配置和活动横幅</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm whitespace-nowrap flex-shrink-0"
                >
                    <Save size={18} />
                    {saving ? '保存中...' : '保存更改'}
                </button>
            </div>

            {/* Homepage Banner Config */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                    <LayoutTemplate size={18} className="text-indigo-600" />
                    <h2 className="font-bold text-gray-800">首页活动横幅</h2>
                </div>
                <div className="p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5 col-span-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                <Type size={14} /> 标题 (Title)
                            </label>
                            <input
                                type="text"
                                value={config.home_banner_title}
                                onChange={e => setConfig({ ...config, home_banner_title: e.target.value })}
                                placeholder="例如：探索数字资产的无限可能"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                            />
                            <p className="text-xs text-gray-400">留空则显示默认标题。</p>
                        </div>

                        <div className="space-y-1.5 col-span-2">
                            <label className="text-sm font-semibold text-gray-700">描述 (Description)</label>
                            <textarea
                                value={config.home_banner_desc}
                                onChange={e => setConfig({ ...config, home_banner_desc: e.target.value })}
                                placeholder="例如：一站式数字商品交易平台..."
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm resize-none"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700">按钮文字</label>
                            <input
                                type="text"
                                value={config.home_banner_btn_text}
                                onChange={e => setConfig({ ...config, home_banner_btn_text: e.target.value })}
                                placeholder="例如：浏览商店"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                <LinkIcon size={14} /> 按钮链接
                            </label>
                            <input
                                type="text"
                                value={config.home_banner_btn_link}
                                onChange={e => setConfig({ ...config, home_banner_btn_link: e.target.value })}
                                placeholder="例如：/products 或 /groups/123"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-mono"
                            />
                            <p className="text-xs text-gray-400">支持相对路径 (/groups/1) 或 绝对路径 (https://...)</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
