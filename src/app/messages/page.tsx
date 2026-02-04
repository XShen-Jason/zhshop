'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bell, ChevronRight, Image as ImageIcon, Users, Megaphone, User as UserIcon, ArrowRight as ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
    const router = useRouter(); // Use router for back navigation if needed
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
            <div className="min-h-[60vh] bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    // Message detail view
    if (selectedMessage) {
        return (
            <div className="p-6 max-w-4xl mx-auto min-h-screen">
                <div className="flex justify-between items-center mb-6">
                    <button
                        onClick={() => setSelectedMessage(null)}
                        className="text-sm text-gray-500 hover:text-gray-900 flex items-center transition-colors"
                    >
                        <ArrowRightIcon className="rotate-180 mr-2" size={16} /> 返回列表
                    </button>
                </div>

                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden p-6 md:p-12">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                        {selectedMessage.type === 'announcement' ? (
                            <span className="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold">
                                <Megaphone size={14} /> 系统公告
                            </span>
                        ) : selectedMessage.type === 'user_specific' ? (
                            <span className="flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">
                                <UserIcon size={14} /> 私信
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 bg-green-50 text-green-600 px-3 py-1 rounded-full text-xs font-bold">
                                <Users size={14} /> 拼团通知
                            </span>
                        )}
                        <span className="ml-auto">{formatTime(selectedMessage.created_at)}</span>
                    </div>

                    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-6">{selectedMessage.title}</h1>

                    {selectedMessage.groupTitle && (
                        <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="text-xs text-gray-400 mb-1">关联拼团</div>
                            <div className="font-medium text-gray-900">{selectedMessage.groupTitle}</div>
                        </div>
                    )}

                    {selectedMessage.image_url && (
                        <img
                            src={selectedMessage.image_url}
                            alt=""
                            className="w-full rounded-2xl mb-8 shadow-sm border border-gray-100"
                        />
                    )}

                    <div className="prose prose-lg max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {selectedMessage.content}
                    </div>
                </div>
            </div>
        );
    }

    // Message list view
    return (
        <div className="max-w-4xl mx-auto min-h-screen pt-4 md:pt-8 pb-12 px-4 sm:px-6">
            {/* Header */}
            <div className="flex justify-between items-end mb-6 md:mb-8">
                <div>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-1 md:mb-2">消息中心</h2>
                    <p className="text-sm md:text-base text-gray-500">查看您的所有通知与私信</p>
                </div>
                {messages.filter(m => !m.isRead).length > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md shadow-red-200 animate-in zoom-in mb-2">
                        {messages.filter(m => !m.isRead).length} 未读
                    </span>
                )}
            </div>

            <main>
                {messages.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
                        <div className="mx-auto w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                            <Bell size={32} className="text-indigo-400" />
                        </div>
                        <h3 className="text-gray-900 font-bold text-lg mb-2">暂无消息</h3>
                        <p className="text-gray-500 text-sm">当有新的拼团动态、系统公告或私信时，我们会第一时间通知您。</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((message, index) => (
                            <button
                                key={message.id}
                                onClick={() => openMessage(message)}
                                style={{ animationDelay: `${index * 50}ms` }}
                                className={`w-full text-left bg-white rounded-2xl p-5 shadow-sm hover:shadow-md border transition-all duration-300 active:scale-[0.99] flex items-start gap-4 md:gap-6 group animate-in fade-in slide-in-from-bottom-2 ${!message.isRead
                                    ? 'border-indigo-100 ring-2 ring-indigo-50'
                                    : 'border-gray-100'
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
                                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full shadow-sm animate-pulse"></span>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 py-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className={`font-bold text-base truncate pr-4 transition-colors ${!message.isRead ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'}`}>
                                            {message.title}
                                        </h3>
                                        <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                                            {formatTime(message.created_at)}
                                        </span>
                                    </div>

                                    <p className={`text-sm line-clamp-2 leading-relaxed mb-2 ${!message.isRead ? 'text-gray-600 font-medium' : 'text-gray-400 group-hover:text-gray-500'}`}>
                                        {message.content}
                                    </p>

                                    <div className="flex items-center gap-2">
                                        {message.groupTitle && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-50 text-gray-500 border border-gray-100">
                                                {message.groupTitle}
                                            </span>
                                        )}
                                        {message.type === 'announcement' && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-500 border border-indigo-100">
                                                官方公告
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="self-center hidden md:block opacity-0 group-hover:opacity-100 transition-opacity text-gray-300">
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
