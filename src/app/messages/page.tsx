'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bell, Check, ChevronRight, Image as ImageIcon, Users, Megaphone, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { messageEvents } from '@/lib/events';

interface Message {
    id: string;
    type: 'announcement' | 'group_notice' | 'user_specific';
    title: string;
    content: string;
    image_url?: string;
    group_id?: string;
    groupTitle?: string;
    created_at: string;
    isRead: boolean;
}

export default function MessagesPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

    useEffect(() => {
        fetchMessages();
    }, []);

    const fetchMessages = async () => {
        try {
            const res = await fetch('/api/messages');
            if (res.ok) {
                setMessages(await res.json());
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const openMessage = async (message: Message) => {
        setSelectedMessage(message);

        // Mark as read
        if (!message.isRead) {
            try {
                await fetch(`/api/messages/${message.id}`);
                // Update local state
                setMessages(prev => prev.map(m =>
                    m.id === message.id ? { ...m, isRead: true } : m
                ));
                // Emit event to notify Navbar to refresh unread count
                messageEvents.emitRead();
            } catch (error) {
                console.error('Error marking as read:', error);
            }
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;

        return date.toLocaleDateString('zh-CN');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
            </div>
        );
    }

    // Message detail view
    if (selectedMessage) {
        return (
            <div className="min-h-screen bg-gray-50">
                <header className="bg-white border-b sticky top-0 z-10">
                    <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
                        <button
                            onClick={() => setSelectedMessage(null)}
                            className="p-2 -ml-2 hover:bg-gray-100 rounded-lg"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="font-bold text-lg truncate">{selectedMessage.title}</h1>
                    </div>
                </header>

                <main className="max-w-2xl mx-auto px-4 py-6">
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                            {selectedMessage.type === 'announcement' ? (
                                <><Megaphone size={16} className="text-indigo-500" /> 系统公告</>
                            ) : selectedMessage.type === 'user_specific' ? (
                                <><UserIcon size={16} className="text-blue-500" /> 私信</>
                            ) : (
                                <><Users size={16} className="text-green-500" /> 拼团通知 · {selectedMessage.groupTitle}</>
                            )}
                            <span className="ml-auto">{formatTime(selectedMessage.created_at)}</span>
                        </div>

                        <h2 className="text-xl font-bold text-gray-900 mb-4">{selectedMessage.title}</h2>

                        {selectedMessage.image_url && (
                            <img
                                src={selectedMessage.image_url}
                                alt=""
                                className="w-full rounded-lg mb-4 max-h-80 object-cover"
                            />
                        )}

                        <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                            {selectedMessage.content}
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // Message list view
    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-gray-100/50">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/user" className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-full transition-all hover:scale-105 active:scale-95">
                            <ArrowLeft size={22} />
                        </Link>
                        <h1 className="font-bold text-xl text-gray-900 tracking-tight">消息中心</h1>
                    </div>

                    {messages.filter(m => !m.isRead).length > 0 && (
                        <span className="bg-red-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm shadow-red-200 animate-in zoom-in">
                            {messages.filter(m => !m.isRead).length} 未读
                        </span>
                    )}
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-6">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center opacity-0 animate-in fade-in duration-700 slide-in-from-bottom-4">
                        <div className="w-24 h-24 bg-gradient-to-tr from-indigo-50 to-white rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-indigo-50/50">
                            <Bell size={40} className="text-indigo-200" />
                        </div>
                        <h3 className="text-gray-900 font-semibold text-lg mb-2">暂无消息</h3>
                        <p className="text-gray-400 text-sm max-w-xs leading-relaxed">当有新的拼团动态、系统公告或私信时，我们会第一时间通知您。</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((message, index) => (
                            <button
                                key={message.id}
                                onClick={() => openMessage(message)}
                                style={{ animationDelay: `${index * 50}ms` }}
                                className={`w-full text-left bg-white rounded-2xl p-5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_16px_-4px_rgba(0,0,0,0.08)] border transition-all duration-300 active:scale-[0.98] flex items-start gap-5 group animate-in fade-in slide-in-from-bottom-2 ${!message.isRead
                                    ? 'border-indigo-100/60 ring-4 ring-indigo-50/30'
                                    : 'border-transparent hover:border-gray-100'
                                    }`}
                            >
                                {/* Icon with status indicator */}
                                <div className="relative flex-shrink-0">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-300 ${message.type === 'announcement'
                                        ? 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'
                                        : message.type === 'user_specific'
                                            ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'
                                            : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100'
                                        }`}>
                                        {message.type === 'announcement' ? <Megaphone size={20} /> : message.type === 'user_specific' ? <UserIcon size={20} /> : <Users size={20} />}
                                    </div>
                                    {!message.isRead && (
                                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full shadow-sm animate-pulse"></span>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 py-0.5">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <h3 className={`font-semibold text-base truncate pr-4 transition-colors ${!message.isRead ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}`}>
                                            {message.title}
                                        </h3>
                                        <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0 font-medium bg-gray-50 px-2 py-1 rounded-full group-hover:bg-gray-100 transition-colors">
                                            {formatTime(message.created_at)}
                                        </span>
                                    </div>

                                    <p className={`text-sm line-clamp-2 leading-relaxed mb-3 ${!message.isRead ? 'text-gray-600' : 'text-gray-400 group-hover:text-gray-500'}`}>
                                        {message.content}
                                    </p>

                                    {(message.image_url || message.groupTitle) && (
                                        <div className="flex items-center gap-2">
                                            {message.groupTitle && (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-50 text-gray-600 group-hover:bg-gray-100 transition-colors border border-gray-100 group-hover:border-gray-200">
                                                    {message.groupTitle}
                                                </span>
                                            )}
                                            {message.image_url && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-indigo-600 bg-indigo-50 group-hover:bg-indigo-100 transition-colors">
                                                    <ImageIcon size={14} />
                                                    <span>图片附件</span>
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="self-center opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-gray-300">
                                    <ChevronRight size={20} />
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
