'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, BookOpen, Users, Gift, Mail, ExternalLink, ShieldCheck, Clock, Zap, MessageCircle } from 'lucide-react';

interface SiteConfig {
    telegram_link?: string;
    footer_copyright?: string;
    footer_qr_image?: string;
    footer_qr_title?: string;
    official_email?: string;
    qq_group_link?: string;
    friend_links?: string;
}

export default function Footer() {
    const [config, setConfig] = useState<SiteConfig>({});
    const [friendLinks, setFriendLinks] = useState<{ title: string; url: string }[]>([]);

    useEffect(() => {
        fetch('/api/site-config')
            .then(res => res.json())
            .then(data => {
                setConfig(data);
                if (data.friend_links) {
                    try {
                        const links = data.friend_links.split('\n').map((line: string) => {
                            const [title, url] = line.split('|');
                            return { title: title?.trim(), url: url?.trim() };
                        }).filter((l: any) => l.title && l.url);
                        setFriendLinks(links);
                    } catch (e) { console.error('Error parsing friend links', e); }
                }
            })
            .catch(() => { });
    }, []);

    const currentYear = new Date().getFullYear();
    const copyright = config.footer_copyright || `© ${currentYear} 智汇商城 版权所有`;

    return (
        <footer className="bg-white border-t border-gray-100 mt-auto">
            {/* Service Guarantee */}
            <div className="border-b border-gray-50 bg-gray-50/50">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                        <div className="flex flex-col items-center gap-2 group">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full group-hover:scale-110 transition-transform">
                                <ShieldCheck size={28} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800">安全保障</h4>
                                <p className="text-xs text-gray-500 mt-1">严格筛选 放心交易</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-center gap-2 group">
                            <div className="p-3 bg-purple-50 text-purple-600 rounded-full group-hover:scale-110 transition-transform">
                                <Clock size={28} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800">7x24小时</h4>
                                <p className="text-xs text-gray-500 mt-1">全天候自动发货</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-center gap-2 group">
                            <div className="p-3 bg-pink-50 text-pink-600 rounded-full group-hover:scale-110 transition-transform">
                                <Zap size={28} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800">极速响应</h4>
                                <p className="text-xs text-gray-500 mt-1">即时到账 无需等待</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-center gap-2 group">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-full group-hover:scale-110 transition-transform">
                                <MessageCircle size={28} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800">售后无忧</h4>
                                <p className="text-xs text-gray-500 mt-1">专业客服 全程指导</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="md:col-span-1 space-y-4">
                        <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center">
                            <Gift size={24} className="mr-2 text-indigo-600" />
                            智汇商城
                        </h3>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            一站式数字商品交易平台，致力于为您提供最优质的教程资源、拼车合租服务与趣味积分玩法。
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 mb-4">快捷导航</h4>
                        <ul className="space-y-3 text-sm">
                            <li>
                                <Link href="/products" className="text-gray-500 hover:text-indigo-600 transition flex items-center gap-2">
                                    <ShoppingBag size={14} /> 商品中心
                                </Link>
                            </li>
                            <li>
                                <Link href="/groups" className="text-gray-500 hover:text-indigo-600 transition flex items-center gap-2">
                                    <Users size={14} /> 拼团合租
                                </Link>
                            </li>
                            <li>
                                <Link href="/lottery" className="text-gray-500 hover:text-indigo-600 transition flex items-center gap-2">
                                    <Gift size={14} /> 积分抽奖
                                </Link>
                            </li>
                            <li>
                                <Link href="/tutorials" className="text-gray-500 hover:text-indigo-600 transition flex items-center gap-2">
                                    <BookOpen size={14} /> 使用教程
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 mb-4">联系我们</h4>
                        <ul className="space-y-3 text-sm">
                            {config.official_email && (
                                <li>
                                    <a
                                        href={`mailto:${config.official_email}`}
                                        className="text-gray-500 hover:text-indigo-600 transition flex items-center gap-2"
                                    >
                                        <Mail size={14} /> {config.official_email}
                                    </a>
                                </li>
                            )}
                            {config.telegram_link && (
                                <li>
                                    <a
                                        href={config.telegram_link}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-gray-500 hover:text-indigo-600 transition flex items-center gap-2"
                                    >
                                        <ExternalLink size={14} /> Telegram 群组
                                    </a>
                                </li>
                            )}
                            {config.qq_group_link && (
                                <li className="text-gray-500 flex items-center gap-2">
                                    <MessageCircle size={14} /> QQ 群: {config.qq_group_link}
                                </li>
                            )}
                        </ul>
                    </div>

                    {/* QR Code Cards */}
                    {config.footer_qr_image && (
                        <div>
                            <h4 className="text-sm font-bold text-gray-900 mb-4">
                                关注我们
                            </h4>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 inline-flex flex-col items-center">
                                <span className="text-sm font-bold text-gray-800 mb-2">
                                    {config.footer_qr_title || '扫码加群'}
                                </span>
                                <img
                                    src={config.footer_qr_image}
                                    alt="QR Code"
                                    className="w-32 h-32 object-contain rounded-lg"
                                />
                                <p className="text-[10px] text-gray-400 mt-3 text-center max-w-[140px] leading-tight">
                                    扫描上方二维码<br />获取更多福利与资讯
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Friend Links */}
                {friendLinks.length > 0 && (
                    <div className="border-t border-gray-100 mt-10 pt-6">
                        <p className="text-xs text-gray-400 mb-2 font-bold">友情链接：</p>
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                            {friendLinks.map((link, index) => (
                                <a
                                    key={index}
                                    href={link.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hover:text-indigo-600 transition"
                                >
                                    {link.title}
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {/* Bottom Bar */}
                <div className="border-t border-gray-100 mt-6 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-gray-500">{copyright}</p>
                    <div className="flex gap-4 text-xs text-gray-400">
                        <span>隐私政策</span>
                        <span>服务条款</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
