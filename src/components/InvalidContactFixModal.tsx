'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Check, Trash2, X } from 'lucide-react';
import { validateContact, ContactType } from '@/lib/contactValidation';
import { useToast } from '@/lib/GlobalToast';

interface Contact {
    type: string;
    value: string;
    label?: string;
}

interface InvalidContactFixModalProps {
    isOpen: boolean;
    allContacts: Contact[];
    onSuccess: () => void;
}

export function InvalidContactFixModal({ isOpen, allContacts, onSuccess }: InvalidContactFixModalProps) {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        if (isOpen) {
            setContacts(JSON.parse(JSON.stringify(allContacts)));
        }
    }, [isOpen, allContacts]);

    const handleChange = (index: number, newValue: string) => {
        const newContacts = [...contacts];
        newContacts[index].value = newValue;
        setContacts(newContacts);
    };

    const handleDelete = (index: number) => {
        const newContacts = contacts.filter((_, i) => i !== index);
        setContacts(newContacts);
    };

    const invalidIndices = contacts.map((c, i) => {
        const res = validateContact(c.type as ContactType, c.value);
        return res.isValid ? -1 : i;
    }).filter(i => i !== -1);

    const handleSave = async () => {
        // Double check validation
        const stillInvalid = contacts.some(c => !validateContact(c.type as ContactType, c.value).isValid);
        if (stillInvalid) {
            showToast('请修正所有错误后再提交', 'error');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/user/contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contacts }),
            });

            if (res.ok) {
                showToast('修复成功', 'success');
                onSuccess();
            } else {
                showToast('保存失败', 'error');
            }
        } catch (error) {
            console.error('Error saving contacts:', error);
            showToast('网络错误', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    // Filter to show only invalid ones? No, user might delete one and add another? 
    // Actually, usually we just show the whole list or just the invalid ones.
    // Showing only invalid ones is cleaner, but we need to preserve valid ones in the background.
    // Let's show ALL contacts but highlight invalid ones, so user has context.

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
                <div className="p-6 bg-amber-50 border-b border-amber-100 flex items-start gap-3">
                    <div className="p-2 bg-amber-100 rounded-full text-amber-600 shrink-0">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-amber-900">联系方式需更新</h3>
                        <p className="text-sm text-amber-700 mt-1">检测到您的联系方式包含特殊字符或汉字（根据新规），请修正或删除无效的联系方式以继续使用。</p>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    {contacts.length === 0 ? (
                        <p className="text-center text-gray-500 py-4">无联系方式 (点击保存以清空)</p>
                    ) : (
                        contacts.map((contact, index) => {
                            const validation = validateContact(contact.type as ContactType, contact.value);
                            const isInvalid = !validation.isValid;

                            return (
                                <div key={index} className={`p-4 rounded-xl border ${isInvalid ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className={`text-sm font-bold ${isInvalid ? 'text-red-700' : 'text-gray-700'}`}>
                                            {contact.label || contact.type}
                                        </span>
                                        {isInvalid && (
                                            <span className="text-xs text-red-600 flex items-center bg-white px-2 py-0.5 rounded-full border border-red-100">
                                                <X size={10} className="mr-1" /> {validation.message || '格式错误'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={contact.value}
                                            onChange={(e) => handleChange(index, e.target.value)}
                                            className={`flex-1 px-3 py-2 text-sm border rounded-lg outline-none transition-colors ${isInvalid
                                                    ? 'border-red-300 focus:border-red-500 bg-white'
                                                    : 'border-gray-300 focus:border-indigo-500 bg-white'
                                                }`}
                                        />
                                        <button
                                            onClick={() => handleDelete(index)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg border border-transparent hover:border-red-100 transition-colors"
                                            title="删除此项"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    {isInvalid && (
                                        <p className="text-xs text-red-500 mt-2 pl-1">
                                            检测到非法字符，请移除中文或特殊符号
                                        </p>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={loading || invalidIndices.length > 0}
                        className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        {loading ? '保存中...' : <><Check size={18} className="mr-2" /> 保存并继续</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
