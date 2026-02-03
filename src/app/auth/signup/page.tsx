'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, User, UserPlus, AlertCircle, CheckCircle, Gift } from 'lucide-react';
import { signup } from '../actions';

export default function SignupPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState('');

    // Invite code state
    const [inviteCode, setInviteCode] = useState('');
    const [inviteCodeLocked, setInviteCodeLocked] = useState(false);
    const [inviterName, setInviterName] = useState<string | null>(null);
    const [validatingCode, setValidatingCode] = useState(false);

    // Read invite code from URL on mount
    useEffect(() => {
        const refCode = searchParams.get('ref');
        if (refCode) {
            setInviteCode(refCode);
            setInviteCodeLocked(true);
            // Validate the code
            validateInviteCode(refCode);
        }
    }, [searchParams]);

    const validateInviteCode = async (code: string) => {
        if (!code) {
            setInviterName(null);
            return;
        }

        setValidatingCode(true);
        try {
            const res = await fetch(`/api/invite/validate?code=${encodeURIComponent(code)}`);
            const data = await res.json();

            if (data.valid) {
                setInviterName(data.inviterName);
                setError(null);
            } else {
                setInviterName(null);
                if (!inviteCodeLocked) {
                    // Only show error if user typed the code (not from URL)
                    // For URL codes, we'll show error on submit
                }
            }
        } catch (err) {
            console.error('Error validating invite code:', err);
        } finally {
            setValidatingCode(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);

        // Validate password
        const password = formData.get('password') as string;
        if (password.length < 6) {
            setError('密码至少需要6个字符');
            setLoading(false);
            return;
        }

        // Validate invite code before submitting
        if (inviteCode) {
            const res = await fetch(`/api/invite/validate?code=${encodeURIComponent(inviteCode)}`);
            const data = await res.json();
            if (!data.valid) {
                setError(data.error || '邀请码无效');
                setLoading(false);
                return;
            }
        }

        // Add invite code to form data
        formData.set('inviteCode', inviteCode);

        const result = await signup(formData);

        if (result?.error) {
            setError(result.error);
            setLoading(false);
        } else if (result?.success) {
            setSuccess(true);
            setRegisteredEmail(result.email || '');
            // 3秒后自动跳转到登录页面
            setTimeout(() => {
                router.push(`/auth/login?email=${encodeURIComponent(result.email || '')}`);
            }, 3000);
        }
    };

    // 注册成功显示
    if (success) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center px-4">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-10 text-center">
                        <div className="inline-block p-4 bg-green-100 text-green-600 rounded-full mb-6">
                            <CheckCircle size={48} />
                        </div>
                        <h1 className="text-2xl font-extrabold text-gray-900 mb-4">注册成功!</h1>
                        <p className="text-gray-600 mb-2">
                            我们已向 <strong className="text-indigo-600">{registeredEmail}</strong> 发送了确认邮件。
                        </p>
                        <p className="text-gray-500 text-sm mb-8">
                            请检查您的邮箱并点击确认链接完成验证。
                        </p>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                            <p className="text-amber-700 text-sm">
                                ⚠️ 如果没有收到邮件，请检查垃圾邮件文件夹
                            </p>
                        </div>
                        <p className="text-gray-400 text-sm mb-4">3秒后自动跳转到登录页面...</p>
                        <Link
                            href={`/auth/login?email=${encodeURIComponent(registeredEmail)}`}
                            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition"
                        >
                            立即前往登录
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-10">
                    <div className="text-center mb-8">
                        <div className="inline-block p-3 bg-green-100 text-green-600 rounded-2xl mb-4">
                            <UserPlus size={28} />
                        </div>
                        <h1 className="text-2xl font-extrabold text-gray-900">创建账号</h1>
                        <p className="text-gray-500 mt-2">注册后即可开始购物</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center text-red-600">
                            <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">用户名</label>
                            <div className="relative">
                                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    name="name"
                                    type="text"
                                    required
                                    placeholder="您的用户名"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">邮箱地址</label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    placeholder="your@email.com"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">密码</label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    minLength={6}
                                    placeholder="至少6个字符"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Invite Code Field */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                                邀请码 <span className="text-gray-400 font-normal">(选填)</span>
                            </label>
                            <div className="relative">
                                <Gift size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={inviteCode}
                                    onChange={(e) => {
                                        const code = e.target.value.toUpperCase();
                                        setInviteCode(code);
                                        if (code.length >= 8) {
                                            validateInviteCode(code);
                                        } else {
                                            setInviterName(null);
                                        }
                                    }}
                                    disabled={inviteCodeLocked}
                                    placeholder="填写邀请码获得额外积分"
                                    className={`w-full border rounded-xl pl-12 pr-4 py-3 text-sm outline-none transition-all ${inviteCodeLocked
                                            ? 'bg-green-50 border-green-200 text-green-700 cursor-not-allowed'
                                            : 'bg-gray-50 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white'
                                        }`}
                                />
                                {validatingCode && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}
                            </div>
                            {inviterName && (
                                <p className="mt-2 text-sm text-green-600 flex items-center">
                                    <CheckCircle size={14} className="mr-1" />
                                    来自 <strong className="mx-1">{inviterName}</strong> 的邀请 · 额外获得 100 积分
                                </p>
                            )}
                            {inviteCodeLocked && (
                                <p className="mt-1 text-xs text-gray-400">邀请码已锁定</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? '注册中...' : '注册'}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm text-gray-500">
                        已有账号？{' '}
                        <Link href="/auth/login" className="text-indigo-600 font-bold hover:underline">
                            立即登录
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
