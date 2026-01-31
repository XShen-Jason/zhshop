'use client';

import React, { useState, useEffect } from 'react';
import { X, Users, Edit2, Minus, Plus, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ContactSelector } from '@/components/ContactSelector';

interface ModifyParticipationModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupId: string;
    groupTitle: string;
    groupPrice: number;
    targetCount: number;
    currentCount: number;
    userQuantity: number;
    userContactInfo?: string;
    onSuccess: () => void;
    isNewParticipation?: boolean;
}

export function ModifyParticipationModal({
    isOpen,
    onClose,
    groupId,
    groupTitle,
    groupPrice,
    targetCount,
    currentCount,
    userQuantity,
    userContactInfo,
    onSuccess,
    isNewParticipation = false
}: ModifyParticipationModalProps) {
    const [quantity, setQuantity] = useState(isNewParticipation ? 1 : userQuantity);
    const [contact, setContact] = useState(userContactInfo || '');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    // Calculate available slots correctly:
    // - For new participation: available = target - current (user hasn't taken any yet)
    // - For modify: available = target - (current - userQuantity) = target - current + userQuantity
    const availableForNew = targetCount - currentCount;
    const availableForModify = targetCount - currentCount + userQuantity;
    const availableSlots = isNewParticipation ? availableForNew : availableForModify;
    const maxQuantity = Math.max(1, availableSlots);

    useEffect(() => {
        if (isOpen) {
            setQuantity(isNewParticipation ? 1 : userQuantity);
            setContact(userContactInfo || '');
            setSuccess(false);
            setError('');
        }
    }, [isOpen, userQuantity, userContactInfo, isNewParticipation]);

    const [migrationInfo, setMigrationInfo] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!contact.trim()) {
            setError('请填写联系方式');
            return;
        }
        if (quantity < 1 || quantity > maxQuantity) {
            setError(`数量需在 1-${maxQuantity} 之间`);
            return;
        }

        setLoading(true);
        setError('');
        setMigrationInfo(null);

        try {
            if (isNewParticipation) {
                // New participation - use orders API
                const res = await fetch('/api/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        itemId: groupId,
                        itemType: 'GROUP',
                        itemName: groupTitle,
                        contact,
                        cost: groupPrice * quantity,
                        quantity,
                        currency: 'CNY'
                    })
                });
                const result = await res.json();
                if (!res.ok) {
                    throw new Error(result.error || '参与失败');
                }
                // Check if user was migrated to an earlier group
                if (result.migratedTo) {
                    setMigrationInfo(result.migratedTo);
                }
            } else {
                // Modify existing - use user groups API
                const res = await fetch('/api/user/groups', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ groupId, newQuantity: quantity, contactInfo: contact })
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || '修改失败');
                }
            }
            setSuccess(true);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, migrationInfo ? 3000 : 1500); // Longer delay if migrated to show the message
        } catch (err: any) {
            setError(err.message || '操作失败');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm('确定取消参与？您的名额将被释放。')) return;
        setLoading(true);
        try {
            const res = await fetch('/api/user/groups', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupId })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || '取消失败');
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || '取消失败');
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
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-bold mb-1">
                                {isNewParticipation ? '参与拼团' : '修改参与信息'}
                            </h3>
                            <p className="text-indigo-100 text-sm">{groupTitle}</p>
                        </div>
                        <button onClick={onClose} className="text-white/80 hover:text-white">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {success ? (
                    <div className="p-8 text-center">
                        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="text-green-600" size={32} />
                        </div>
                        <p className="text-lg font-medium text-gray-900">
                            {isNewParticipation ? '参与成功！' : '修改成功！'}
                        </p>
                        {migrationInfo && (
                            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-sm text-amber-800">
                                    <strong>提示：</strong>您已被自动迁移到更早的团
                                </p>
                                <p className="text-amber-600 font-medium mt-1">
                                    {migrationInfo}
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-6">
                        {/* Group Info */}
                        <div className="bg-gray-50 rounded-xl p-4 mb-6">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-500">价格</span>
                                <span className="font-bold text-gray-900">¥{groupPrice}/人</span>
                            </div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-500">进度</span>
                                <span className="text-gray-900">{currentCount}/{targetCount} 人</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">剩余名额</span>
                                <span className="font-bold text-indigo-600">{availableSlots} 个</span>
                            </div>
                        </div>

                        {/* Quantity */}
                        <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                参与份数
                            </label>
                            <div className="flex items-center justify-center space-x-4">
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    disabled={quantity <= 1}
                                    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center disabled:opacity-40 hover:bg-gray-200 transition"
                                >
                                    <Minus size={18} />
                                </button>
                                <input
                                    type="number"
                                    min={1}
                                    max={maxQuantity}
                                    value={quantity}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 1;
                                        setQuantity(Math.max(1, Math.min(maxQuantity, val)));
                                    }}
                                    className="w-20 text-3xl font-bold text-gray-900 text-center border border-gray-200 rounded-lg py-1 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                />
                                <button
                                    onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                                    disabled={quantity >= maxQuantity}
                                    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center disabled:opacity-40 hover:bg-gray-200 transition"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                            <p className="text-center text-sm text-gray-400 mt-2">
                                最多可选 {maxQuantity} 份
                            </p>
                        </div>

                        {/* Contact */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                联系方式 <span className="text-red-500">*</span>
                            </label>
                            <ContactSelector
                                value={contact}
                                onChange={setContact}
                                placeholder="微信号、邮箱或手机号"
                            />
                        </div>

                        {/* Total */}
                        <div className="flex justify-between items-center p-4 bg-indigo-50 rounded-xl mb-6">
                            <span className="text-gray-600">总计费用</span>
                            <span className="text-2xl font-bold text-indigo-600">
                                ¥{(groupPrice * quantity).toFixed(2)}
                            </span>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                                {error}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="space-y-3">
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="w-full py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
                            >
                                {loading ? '处理中...' : isNewParticipation ? '确认参与' : '保存修改'}
                            </button>

                            {!isNewParticipation && (
                                <button
                                    onClick={handleCancel}
                                    disabled={loading}
                                    className="w-full py-3 bg-red-50 text-red-600 font-medium rounded-xl hover:bg-red-100 transition"
                                >
                                    取消参与
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
