'use client';

import React, { useState, useEffect } from 'react';
import { Send, Megaphone, Users, Trash2, Plus, User as UserIcon } from 'lucide-react';
import { useToast } from '@/lib/GlobalToast';
import { useConfirm } from '@/lib/ConfirmContext';

interface Message {
    id: string;
    type: 'announcement' | 'group_notice' | 'user_specific';
    title: string;
    content: string;
    image_url?: string;
    group_id?: string;
    group_buys?: { title: string };
    created_at: string;
}

interface GroupBuy {
    id: string;
    title: string;
    status: string;
}

export default function AdminMessagesPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [groups, setGroups] = useState<GroupBuy[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [sending, setSending] = useState(false);

    // Form state
    const [messageType, setMessageType] = useState<'announcement' | 'group_notice' | 'user_specific'>('announcement');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [targetUser, setTargetUser] = useState('');

    const { showToast } = useToast();
    const { confirm } = useConfirm();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [messagesRes, groupsRes] = await Promise.all([
                fetch('/api/admin/messages'),
                fetch('/api/groups')
            ]);

            if (messagesRes.ok) {
                setMessages(await messagesRes.json());
            }
            if (groupsRes.ok) {
                const groupsData = await groupsRes.json();
                setGroups(groupsData.filter((g: GroupBuy) => g.status === '已锁单' || g.status === '已结束'));
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim() || !content.trim()) {
            showToast('请填写标题和内容', 'error');
            return;
        }

        if (messageType === 'group_notice' && !selectedGroupId) {
            showToast('请选择拼团', 'error');
            return;
        }

        if (messageType === 'user_specific' && !targetUser.trim()) {
            showToast('请填写目标用户', 'error');
            return;
        }

        setSending(true);
        try {
            const res = await fetch('/api/admin/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: messageType,
                    title: title.trim(),
                    content: content.trim(),
                    imageUrl: imageUrl.trim() || null,
                    groupId: messageType === 'group_notice' ? selectedGroupId : null,
                    targetUser: messageType === 'user_specific' ? targetUser.trim() : null
                })
            });

            if (res.ok) {
                showToast('消息发送成功', 'success');
                setShowForm(false);
                resetForm();
                fetchData();
            } else {
                const data = await res.json();
                showToast(data.error || '发送失败', 'error');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            showToast('发送失败', 'error');
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirm({
            title: '确认删除',
            message: '确定要删除这条消息吗？此操作不可恢复。',
            confirmText: '删除',
            cancelText: '取消'
        });

        if (!confirmed) return;

        try {
            const res = await fetch('/api/admin/messages', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });

            if (res.ok) {
                showToast('删除成功', 'success');
                fetchData();
            }
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    };

    const resetForm = () => {
        setMessageType('announcement');
        setTitle('');
        setContent('');
        setImageUrl('');
        setSelectedGroupId('');
        setTargetUser('');
    };

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('zh-CN');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">消息管理</h2>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 whitespace-nowrap"
                >
                    <Plus size={18} />
                    发布消息
                </button>
            </div>

            {/* Messages List */}
            {messages.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                    <Megaphone size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>暂无消息</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {messages.map(message => (
                        <div
                            key={message.id}
                            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2 mb-2">
                                    {message.type === 'announcement' ? (
                                        <span className="flex items-center gap-1 text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full whitespace-nowrap">
                                            <Megaphone size={12} /> 公告
                                        </span>
                                    ) : message.type === 'user_specific' ? (
                                        <span className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full whitespace-nowrap">
                                            <UserIcon size={12} /> 私信
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full whitespace-nowrap">
                                            <Users size={12} /> 拼团通知
                                        </span>
                                    )}
                                    {message.group_buys?.title && (
                                        <span className="text-xs text-gray-500">{message.group_buys.title}</span>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDelete(message.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <h3 className="font-medium text-gray-900 mb-1">{message.title}</h3>
                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">{message.content}</p>

                            {message.image_url && (
                                <img src={message.image_url} alt="" className="w-20 h-20 object-cover rounded-lg mb-2" />
                            )}

                            <p className="text-xs text-gray-400">{formatTime(message.created_at)}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Send Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <form onSubmit={handleSend} className="p-6">
                            <h3 className="font-bold text-lg mb-4">发布新消息</h3>

                            {/* Message Type */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">消息类型</label>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setMessageType('announcement')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 transition-all whitespace-nowrap ${messageType === 'announcement'
                                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                            }`}
                                    >
                                        <Megaphone size={18} />
                                        全站公告
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMessageType('group_notice')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 transition-all whitespace-nowrap ${messageType === 'group_notice'
                                            ? 'border-green-600 bg-green-50 text-green-700'
                                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                            }`}
                                    >
                                        <Users size={18} />
                                        拼团通知
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMessageType('user_specific')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 transition-all whitespace-nowrap ${messageType === 'user_specific'
                                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                            }`}
                                    >
                                        <UserIcon size={18} />
                                        指定用户
                                    </button>
                                </div>
                            </div>

                            {/* Group Select (for group_notice) */}
                            {messageType === 'group_notice' && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">选择拼团</label>
                                    <select
                                        value={selectedGroupId}
                                        onChange={e => setSelectedGroupId(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        required
                                    >
                                        <option value="">请选择</option>
                                        {groups.map(group => (
                                            <option key={group.id} value={group.id}>
                                                {group.title} ({group.status})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Target User Input (for user_specific) */}
                            {messageType === 'user_specific' && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">目标用户 (ID 或 Email)</label>
                                    <input
                                        type="text"
                                        value={targetUser}
                                        onChange={e => setTargetUser(e.target.value)}
                                        placeholder="请输入用户 ID 或 Email"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">系统将自动尝试匹配用户 ID 或 Email 地址。</p>
                                </div>
                            )}

                            {/* Title */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">标题</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="消息标题"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    required
                                />
                            </div>

                            {/* Content */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">内容</label>
                                <textarea
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    placeholder="消息内容"
                                    rows={5}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    required
                                />
                            </div>

                            {/* Image URL */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    图片链接 (可选)
                                </label>
                                <input
                                    type="url"
                                    value={imageUrl}
                                    onChange={e => setImageUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setShowForm(false); resetForm(); }}
                                    className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    disabled={sending}
                                    className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
                                >
                                    <Send size={16} />
                                    {sending ? '发送中...' : '发送'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
