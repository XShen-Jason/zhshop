'use client';

import React, { useState } from 'react';
import { X, CheckCircle, MessageCircle, Phone, Save } from 'lucide-react';
import { useToast } from '@/lib/GlobalToast';

import { validateContact } from '@/lib/contactValidation';

interface Contact {
    type: string;
    value: string;
    label?: string;
}

interface FirstTimeContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    existingContacts: Contact[];
    onSuccess: () => void;
    allowSkip?: boolean;
}

export function FirstTimeContactModal({ isOpen, onClose, existingContacts, onSuccess, allowSkip = true }: FirstTimeContactModalProps) {
    const [wechat, setWechat] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const { showToast } = useToast();

    if (!isOpen) return null;

    const handleSave = async () => {
        setFieldErrors({});

        if (!wechat && !phone) {
            showToast('请至少填写一项联系方式', 'error');
            return;
        }

        let hasError = false;
        const newFieldErrors: Record<string, string> = {};

        if (wechat) {
            const res = validateContact('WeChat', wechat);
            if (!res.isValid) {
                newFieldErrors['WeChat'] = res.message || '格式错误';
                hasError = true;
            }
        }

        if (phone) {
            const res = validateContact('Phone', phone);
            if (!res.isValid) {
                newFieldErrors['Phone'] = res.message || '格式错误';
                hasError = true;
            }
        }

        if (hasError) {
            setFieldErrors(newFieldErrors);
            return;
        }

        setLoading(true);
        try {
            // Merge new contacts with existing
            const newContacts = [...existingContacts];

            // Remove old Wechat/Phone if exists to replace them
            const filteredContacts = newContacts.filter(c => {
                if (wechat && c.type === 'WeChat') return false;
                if (phone && c.type === 'Phone') return false;
                return true;
            });

            if (wechat) filteredContacts.push({ type: 'WeChat', value: wechat, label: '微信' });
            if (phone) filteredContacts.push({ type: 'Phone', value: phone, label: '手机号' });

            const res = await fetch('/api/user/contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contacts: filteredContacts }),
            });

            if (res.ok) {
                showToast('保存成功，感谢您的配合！', 'success');
                onSuccess();
            } else {
                showToast('保存失败', 'error');
            }
        } catch (error) {
            console.error('Save contact error:', error);
            showToast('网络错误', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white text-center">
                    <h2 className="text-xl font-bold mb-2">👋 补充联系方式</h2>
                    <p className="text-indigo-100 text-sm">为了确保发货与通知，请至少填写一项联系方式</p>
                </div>

                <div className="p-6 md:p-8 space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                            <MessageCircle size={16} className="mr-2 text-green-500" /> 微信
                        </label>
                        <input
                            type="text"
                            value={wechat}
                            onChange={(e) => {
                                setWechat(e.target.value);
                                if (fieldErrors['WeChat']) setFieldErrors({ ...fieldErrors, WeChat: '' });
                            }}
                            placeholder="填写微信号"
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 outline-none transition ${fieldErrors['WeChat'] ? 'border-red-300 bg-red-50 focus:ring-red-200' : 'bg-gray-50 border-gray-200 focus:ring-green-500'}`}
                        />
                        {fieldErrors['WeChat'] && <p className="text-xs text-red-500 mt-1 ml-1">{fieldErrors['WeChat']}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                            <Phone size={16} className="mr-2 text-indigo-500" /> 手机号
                        </label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => {
                                setPhone(e.target.value);
                                if (fieldErrors['Phone']) setFieldErrors({ ...fieldErrors, Phone: '' });
                            }}
                            placeholder="填写手机号码"
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 outline-none transition ${fieldErrors['Phone'] ? 'border-red-300 bg-red-50 focus:ring-red-200' : 'bg-gray-50 border-gray-200 focus:ring-indigo-500'}`}
                        />
                        {fieldErrors['Phone'] && <p className="text-xs text-red-500 mt-1 ml-1">{fieldErrors['Phone']}</p>}
                    </div>

                    <div className="pt-4 flex gap-3">
                        {allowSkip && (
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 text-gray-500 font-medium hover:bg-gray-50 rounded-xl transition"
                            >
                                跳过
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="flex-[2] py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition disabled:opacity-70 flex items-center justify-center"
                        >
                            {loading ? '保存中...' : <><Save size={18} className="mr-2" /> 保存联系方式</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
