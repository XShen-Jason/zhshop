'use client';

import React, { useState, useEffect } from 'react';
import { Save, User, Mail, MessageCircle, Phone, Send, CheckCircle, Plus, Trash2, Lock } from 'lucide-react';
import { useToast } from '@/lib/GlobalToast';
import ChangePasswordModal from './ChangePasswordModal';

interface Contact {
    type: string;
    value: string;
    label?: string;
}

interface ProfileSettingsProps {
    initialContacts: Contact[];
    userEmail?: string;
    onUpdate: () => void;
}

export function ProfileSettings({ initialContacts, userEmail, onUpdate }: ProfileSettingsProps) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const { showToast } = useToast();

    // Fixed fields state
    const [qq, setQq] = useState('');
    const [wechat, setWechat] = useState('');
    const [telegram, setTelegram] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');

    // Custom contacts
    const [customContacts, setCustomContacts] = useState<{ label: string; value: string }[]>([]);

    // Initialize from props
    useEffect(() => {
        const getVal = (type: string) => initialContacts.find(c => c.type === type)?.value || '';

        setQq(getVal('QQ'));
        setWechat(getVal('WeChat'));
        setTelegram(getVal('Telegram'));
        setPhone(getVal('Phone'));

        // Email logic: Use saved email if exists, otherwise default to userEmail (registration email)
        const savedEmail = getVal('Email');
        setEmail(savedEmail || userEmail || '');

        // Load custom contacts (type === 'Other')
        const others = initialContacts
            .filter(c => c.type === 'Other')
            .map(c => ({ label: c.label || '其他', value: c.value }));
        setCustomContacts(others);
    }, [initialContacts, userEmail]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(false);

        // Construct array for backend
        const newContacts: Contact[] = [];
        if (qq.trim()) newContacts.push({ type: 'QQ', value: qq.trim(), label: 'QQ' });
        if (wechat.trim()) newContacts.push({ type: 'WeChat', value: wechat.trim(), label: '微信' });
        if (telegram.trim()) newContacts.push({ type: 'Telegram', value: telegram.trim(), label: 'Telegram' });
        if (phone.trim()) newContacts.push({ type: 'Phone', value: phone.trim(), label: '手机号' });
        if (email.trim()) newContacts.push({ type: 'Email', value: email.trim(), label: '邮箱' });

        // Add custom contacts
        customContacts.forEach(c => {
            if (c.value.trim()) {
                newContacts.push({
                    type: 'Other',
                    value: c.value.trim(),
                    label: c.label.trim() || '其他'
                });
            }
        });

        try {
            const res = await fetch('/api/user/contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contacts: newContacts }),
            });

            if (res.ok) {
                setSuccess(true);
                showToast('保存成功！', 'success');
                onUpdate();
                setTimeout(() => setSuccess(false), 3000);
            } else {
                showToast('保存失败', 'error');
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            showToast('网络错误，请稍后重试', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden mb-8">
            <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-xl text-gray-800 flex items-center">
                            <User className="mr-2 text-indigo-600" /> 个人信息设置
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">完善联系方式，方便管理员与您取得联系</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowPasswordModal(true)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition flex items-center gap-2 text-sm font-medium"
                    >
                        <Lock size={16} />
                        修改密码
                    </button>
                </div>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-6 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* QQ */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <MessageCircle size={16} className="mr-2 text-blue-500" /> QQ
                        </label>
                        <input
                            type="text"
                            value={qq}
                            onChange={e => setQq(e.target.value)}
                            placeholder="请输入QQ号"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition outline-none"
                        />
                    </div>

                    {/* WeChat */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <MessageCircle size={16} className="mr-2 text-green-500" /> 微信 (WeChat)
                        </label>
                        <input
                            type="text"
                            value={wechat}
                            onChange={e => setWechat(e.target.value)}
                            placeholder="请输入微信号"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white transition outline-none"
                        />
                    </div>

                    {/* Telegram */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <Send size={16} className="mr-2 text-sky-500" /> Telegram
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-3.5 text-gray-400">@</span>
                            <input
                                type="text"
                                value={telegram.replace(/^@/, '')}
                                onChange={e => setTelegram(e.target.value)}
                                placeholder="username"
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white transition outline-none"
                            />
                        </div>
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <Phone size={16} className="mr-2 text-indigo-500" /> 手机号
                        </label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            placeholder="请输入手机号码"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition outline-none"
                        />
                    </div>

                    {/* Email */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <Mail size={16} className="mr-2 text-amber-500" /> 电子邮箱
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="example@email.com"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white transition outline-none"
                        />
                        <p className="text-xs text-gray-400 mt-1 ml-1">默认为注册邮箱，可修改</p>
                    </div>

                    {/* Custom Contacts */}
                    <div className="md:col-span-2 pt-4 border-t border-gray-100">
                        <label className="block text-sm font-medium text-gray-700 mb-4 flex items-center justify-between">
                            <span className="flex items-center">
                                <MessageCircle size={16} className="mr-2 text-gray-500" /> 其他联系方式
                            </span>
                            <button
                                type="button"
                                onClick={() => setCustomContacts([...customContacts, { label: '', value: '' }])}
                                className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full hover:bg-indigo-100 transition flex items-center"
                            >
                                <Plus size={12} className="mr-1" /> 添加自定义
                            </button>
                        </label>

                        <div className="space-y-3">
                            {customContacts.map((contact, index) => (
                                <div key={index} className="flex space-x-3">
                                    <input
                                        type="text"
                                        value={contact.label}
                                        onChange={e => {
                                            const newContacts = [...customContacts];
                                            newContacts[index].label = e.target.value;
                                            setCustomContacts(newContacts);
                                        }}
                                        placeholder="名称 (如: discord)"
                                        className="w-1/3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    />
                                    <input
                                        type="text"
                                        value={contact.value}
                                        onChange={e => {
                                            const newContacts = [...customContacts];
                                            newContacts[index].value = e.target.value;
                                            setCustomContacts(newContacts);
                                        }}
                                        placeholder="联系方式内容"
                                        className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newContacts = customContacts.filter((_, i) => i !== index);
                                            setCustomContacts(newContacts);
                                        }}
                                        className="p-3 text-gray-400 hover:text-red-500"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                            {customContacts.length === 0 && (
                                <p className="text-sm text-gray-400 italic">暂无其他联系方式，如有需要请点击上方添加</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-gray-100">
                    {success ? (
                        <div className="flex items-center text-green-600 font-medium animate-in fade-in slide-in-from-left-2">
                            <CheckCircle className="mr-2" /> 保存成功
                        </div>
                    ) : (
                        <div className="text-sm text-gray-400">请确保填写正确，以便及时接收通知</div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all transform active:scale-95 flex items-center"
                    >
                        {loading ? '保存中...' : <><Save size={18} className="mr-2" /> 保存设置</>}
                    </button>
                </div>
            </form>

            {/* Password Change Modal */}
            <ChangePasswordModal
                isOpen={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
            />
        </div>
    );
}
