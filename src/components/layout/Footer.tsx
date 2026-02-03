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
        const fetchConfig = async () => {
            try {
                const res = await fetch('/api/site-config');
                if (res.ok) {
                    const data = await res.json();
                    setConfig(data);
                    if (data.friend_links) {
                        const links = data.friend_links.split('\n').map((line: string) => {
                            const [title, url] = line.split('|');
                            return { title: title?.trim(), url: url?.trim() };
                        }).filter((l: any) => l.title && l.url);
                        setFriendLinks(links);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch site config:', error);
            }
        };

        fetchConfig();
    }, []);

    const currentYear = new Date().getFullYear();
    const copyright = config.footer_copyright || `© ${currentYear} 智汇商城 版权所有`;

    return (
        <footer className="bg-white border-t border-gray-100 mt-auto">
            {/* Service Guarantee */}
            <div className="border-b border-gray-50 bg-gray-50/50">
                <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 text-center">
                        <div className="flex flex-col items-center gap-1.5 md:gap-2 group">
                            <div className="p-2.5 md:p-3 bg-indigo-50 text-indigo-600 rounded-full group-hover:scale-110 transition-transform">
                                <ShieldCheck size={22} className="md:w-7 md:h-7" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 text-sm md:text-base">安全保障</h4>
                                <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">严格筛选 放心交易</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-center gap-1.5 md:gap-2 group">
                            <div className="p-2.5 md:p-3 bg-purple-50 text-purple-600 rounded-full group-hover:scale-110 transition-transform">
                                <Clock size={22} className="md:w-7 md:h-7" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 text-sm md:text-base">7x24小时</h4>
                                <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">全天候自动发货</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-center gap-1.5 md:gap-2 group">
                            <div className="p-2.5 md:p-3 bg-pink-50 text-pink-600 rounded-full group-hover:scale-110 transition-transform">
                                <Zap size={22} className="md:w-7 md:h-7" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 text-sm md:text-base">极速响应</h4>
                                <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">即时到账 无需等待</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-center gap-1.5 md:gap-2 group">
                            <div className="p-2.5 md:p-3 bg-blue-50 text-blue-600 rounded-full group-hover:scale-110 transition-transform">
                                <MessageCircle size={22} className="md:w-7 md:h-7" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 text-sm md:text-base">售后无忧</h4>
                                <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">专业客服 全程指导</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                    {/* Brand */}
                    <div className="col-span-2 md:col-span-1 space-y-3 md:space-y-4">
                        <h3 className="text-lg md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center">
                            <Gift size={20} className="mr-2 text-indigo-600 md:w-6 md:h-6" />
                            智汇商城
                        </h3>
                        <p className="text-xs md:text-sm text-gray-500 leading-relaxed">
                            一站式数字商品交易平台，致力于为您提供最优质的教程资源、拼车合租服务与趣味积分玩法。
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-xs md:text-sm font-bold text-gray-900 mb-3 md:mb-4">快捷导航</h4>
                        <ul className="space-y-2 md:space-y-3 text-xs md:text-sm">
                            <li>
                                <Link href="/products" className="text-gray-500 hover:text-indigo-600 transition flex items-center gap-1.5 md:gap-2">
                                    <ShoppingBag size={12} className="md:w-3.5 md:h-3.5" /> 商品中心
                                </Link>
                            </li>
                            <li>
                                <Link href="/groups" className="text-gray-500 hover:text-indigo-600 transition flex items-center gap-1.5 md:gap-2">
                                    <Users size={12} className="md:w-3.5 md:h-3.5" /> 拼团合租
                                </Link>
                            </li>
                            <li>
                                <Link href="/lottery" className="text-gray-500 hover:text-indigo-600 transition flex items-center gap-1.5 md:gap-2">
                                    <Gift size={12} className="md:w-3.5 md:h-3.5" /> 积分抽奖
                                </Link>
                            </li>
                            <li>
                                <Link href="/tutorials" className="text-gray-500 hover:text-indigo-600 transition flex items-center gap-1.5 md:gap-2">
                                    <BookOpen size={12} className="md:w-3.5 md:h-3.5" /> 使用教程
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-xs md:text-sm font-bold text-gray-900 mb-3 md:mb-4">联系我们</h4>
                        <ul className="space-y-2 md:space-y-3 text-xs md:text-sm">
                            {config.official_email && (
                                <li>
                                    <a
                                        href={`mailto:${config.official_email}`}
                                        className="text-gray-500 hover:text-indigo-600 transition flex items-center gap-1.5 md:gap-2"
                                    >
                                        <Mail size={12} className="md:w-3.5 md:h-3.5" /> <span className="truncate">{config.official_email}</span>
                                    </a>
                                </li>
                            )}
                            {config.telegram_link && (
                                <li>
                                    <a
                                        href={config.telegram_link}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-gray-500 hover:text-indigo-600 transition flex items-center gap-1.5 md:gap-2"
                                    >
                                        <ExternalLink size={12} className="md:w-3.5 md:h-3.5" /> Telegram 群组
                                    </a>
                                </li>
                            )}
                            {config.qq_group_link && (
                                <li className="text-gray-500 flex items-center gap-1.5 md:gap-2">
                                    <MessageCircle size={12} className="md:w-3.5 md:h-3.5" /> QQ 群: {config.qq_group_link}
                                </li>
                            )}
                        </ul>
                    </div>

                    {/* QR Code Cards - visible on all devices */}
                    {config.footer_qr_image && (
                        <div>
                            <h4 className="text-xs md:text-sm font-bold text-gray-900 mb-3 md:mb-4">
                                关注我们
                            </h4>
                            <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-100 inline-flex flex-col items-center">
                                <span className="text-xs md:text-sm font-bold text-gray-800 mb-2">
                                    {config.footer_qr_title || '扫码加群'}
                                </span>
                                <img
                                    src={config.footer_qr_image}
                                    alt="QR Code"
                                    className="w-20 h-20 md:w-32 md:h-32 object-contain rounded-lg"
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
