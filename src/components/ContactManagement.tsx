'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Phone, Mail, MessageCircle, Send } from 'lucide-react';
import { useToast } from '@/lib/GlobalToast';
import { useConfirm } from '@/lib/ConfirmContext';

interface Contact {
    type: string;
    value: string;
    label?: string;
    isDefault?: boolean;
}

interface ContactManagementProps {
    initialContacts: Contact[];
    onUpdate: () => void; // Trigger refresh of parent data
}

const CONTACT_TYPES = [
    { value: 'QQ', label: 'QQ', icon: MessageCircle },
    { value: 'WeChat', label: '微信', icon: MessageCircle },
    { value: 'Phone', label: '手机号', icon: Phone },
    { value: 'Email', label: '邮箱', icon: Mail },
    { value: 'Telegram', label: 'Telegram', icon: Send },
    { value: 'Other', label: '其他', icon: MessageCircle },
];

export function ContactManagement({ initialContacts, onUpdate }: ContactManagementProps) {
    const [contacts, setContacts] = useState<Contact[]>(initialContacts || []);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();
    const { confirm } = useConfirm();

    // Form state
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [formData, setFormData] = useState<Contact>({ type: 'QQ', value: '', label: '' });

    const handleSave = async (newContacts: Contact[]) => {
        setLoading(true);
        try {
            const res = await fetch('/api/user/contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contacts: newContacts }),
            });

            if (res.ok) {
                setContacts(newContacts);
                showToast('保存成功！', 'success');
                onUpdate();
                setIsModalOpen(false);
                setEditingIndex(null);
            } else {
                showToast('保存失败，请重试', 'error');
            }
        } catch (error) {
            console.error('Error saving contacts:', error);
            showToast('网络错误，请稍后重试', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newContacts = [...contacts];
        if (editingIndex !== null) {
            newContacts[editingIndex] = formData;
        } else {
            newContacts.push(formData);
        }
        handleSave(newContacts);
    };

    const handleDelete = async (index: number) => {
        const confirmed = await confirm({
            message: '确定删除此联系方式吗？',
            variant: 'danger',
            confirmText: '确定删除'
        });
        if (!confirmed) return;
        const newContacts = contacts.filter((_, i) => i !== index);
        handleSave(newContacts);
    };

    const openModal = (contact?: Contact, index?: number) => {
        if (contact && index !== undefined) {
            setFormData(contact);
            setEditingIndex(index);
        } else {
            setFormData({ type: 'QQ', value: '', label: '' });
            setEditingIndex(null);
        }
        setIsModalOpen(true);
    };

    return (
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden mb-8">
            <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h3 className="font-bold text-xl text-gray-800">常用联系方式</h3>
                <button
                    onClick={() => openModal()}
                    className="flex items-center text-sm font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full hover:bg-indigo-100 transition"
                >
                    <Plus size={16} className="mr-1" /> 添加
                </button>
            </div>

            <div className="p-6 md:p-8">
                {contacts.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                        <p>暂无常用联系方式，添加后可快速购买</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {contacts.map((contact, index) => {
                            const TypeIcon = CONTACT_TYPES.find(t => t.value === contact.type)?.icon || MessageCircle;
                            return (
                                <div key={index} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition group">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                            <TypeIcon size={20} />
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900 flex items-center">
                                                {contact.value}
                                                {contact.label && (
                                                    <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                                                        {contact.label}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-500">{contact.type}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => openModal(contact, index)}
                                            className="p-1.5 text-gray-400 hover:text-indigo-600 rounded bg-white shadow-sm border border-gray-100"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(index)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 rounded bg-white shadow-sm border border-gray-100"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-lg text-gray-900">{editingIndex !== null ? '编辑联系方式' : '添加联系方式'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                                <select
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    {CONTACT_TYPES.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">账号/号码/链接</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.value}
                                    onChange={e => setFormData({ ...formData, value: e.target.value })}
                                    placeholder="请输入具体的联系方式"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">备注 (可选)</label>
                                <input
                                    type="text"
                                    value={formData.label || ''}
                                    onChange={e => setFormData({ ...formData, label: e.target.value })}
                                    placeholder="例如：主号、备用"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div className="pt-4 flex space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition"
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition disabled:opacity-70"
                                >
                                    {loading ? '保存中...' : '保存'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
