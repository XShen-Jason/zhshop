'use client';

import React, { useState } from 'react';
import { X, CheckCircle, Edit2 } from 'lucide-react';

interface ContactEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    recordType: 'order' | 'lottery' | 'group';
    recordId: string;
    recordTitle: string;
    currentContact: string;
    onSuccess: () => void;
}

export function ContactEditModal({
    isOpen,
    onClose,
    recordType,
    recordId,
    recordTitle,
    currentContact,
    onSuccess
}: ContactEditModalProps) {
    const [contact, setContact] = useState(currentContact || '');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!contact.trim()) {
            setError('请填写联系方式');
            return;
        }

        setLoading(true);
        setError('');

        try {
            let res;
            if (recordType === 'order') {
                res = await fetch('/api/user/orders', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId: recordId, contactDetails: contact })
                });
            } else if (recordType === 'lottery') {
                res = await fetch('/api/user/lotteries/update', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lotteryId: recordId, contactInfo: contact })
                });
            } else if (recordType === 'group') {
                res = await fetch('/api/user/groups', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ groupId: recordId, contactInfo: contact })
                });
            }

            if (res && !res.ok) {
                const err = await res.json();
                throw new Error(err.error || '保存失败');
            }

            setSuccess(true);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1000);
        } catch (err: any) {
            setError(err.message || '保存失败');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-gray-700 to-gray-900 p-5 text-white">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center">
                            <Edit2 size={20} className="mr-2" />
                            <h3 className="text-lg font-bold">修改联系方式</h3>
                        </div>
                        <button onClick={onClose} className="text-white/80 hover:text-white">
                            <X size={22} />
                        </button>
                    </div>
                </div>

                {success ? (
                    <div className="p-8 text-center">
                        <div className="mx-auto w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="text-green-600" size={28} />
                        </div>
                        <p className="text-lg font-medium text-gray-900">修改成功！</p>
                    </div>
                ) : (
                    <div className="p-6">
                        <p className="text-sm text-gray-500 mb-4">
                            <span className="font-medium text-gray-700">{recordTitle}</span>
                        </p>

                        <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                联系方式 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={contact}
                                onChange={e => setContact(e.target.value)}
                                placeholder="微信号、邮箱或手机号"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            />
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="w-full py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
                        >
                            {loading ? '保存中...' : '保存修改'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
