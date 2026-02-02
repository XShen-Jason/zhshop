'use client';

import React, { useState } from 'react';
import { X, Minus, Plus, Save } from 'lucide-react';
import { ContactSelector } from '@/components/ContactSelector';

interface ModifyOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId: string;
    orderTitle: string;
    unitPrice: number;
    currentQuantity: number;
    currentContact: string;
    onSuccess: () => void;
}

export function ModifyOrderModal({
    isOpen,
    onClose,
    orderId,
    orderTitle,
    unitPrice,
    currentQuantity,
    currentContact,
    onSuccess
}: ModifyOrderModalProps) {
    const [quantity, setQuantity] = useState(currentQuantity);
    const [contact, setContact] = useState(currentContact);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const totalPrice = unitPrice * quantity;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/orders', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: orderId,
                    quantity,
                    contact
                })
            });

            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                const data = await res.json();
                setError(data.error || '修改失败');
            }
        } catch {
            setError('网络错误，请重试');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-lg text-gray-900">修改订单</h3>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div>
                        <p className="text-sm text-gray-500 mb-2">商品</p>
                        <p className="font-bold text-gray-900">{orderTitle}</p>
                        <p className="text-sm text-gray-500">单价: ¥{unitPrice.toFixed(2)}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">数量</label>
                        <div className="flex items-center justify-center bg-gray-50 border border-gray-200 rounded-xl p-2">
                            <button
                                type="button"
                                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
                            >
                                <Minus size={16} />
                            </button>
                            <span className="mx-6 text-xl font-bold text-gray-900 min-w-[40px] text-center">{quantity}</span>
                            <button
                                type="button"
                                onClick={() => setQuantity(q => q + 1)}
                                className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                        <p className="text-center text-lg font-bold text-indigo-600 mt-2">总计: ¥{totalPrice.toFixed(2)}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">联系方式</label>
                        <ContactSelector
                            value={contact}
                            onChange={setContact}
                            placeholder="Telegram 用户名 / 邮箱"
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
                    )}

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center"
                        >
                            {loading ? '保存中...' : <><Save size={16} className="mr-2" /> 保存修改</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
