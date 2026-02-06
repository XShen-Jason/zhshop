'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Mail, Lock, LogIn, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { login, resendVerification } from '../actions';

function LoginForm() {
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [showWelcome, setShowWelcome] = useState(false);
    const [emailVerified, setEmailVerified] = useState(false);

    // Resend verification states
    const [showResend, setShowResend] = useState(false);
    const [resending, setResending] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);

    // 从 URL 获取预填的 email 和验证成功状态
    useEffect(() => {
        const emailParam = searchParams.get('email');
        const verifiedParam = searchParams.get('verified');

        if (emailParam) {
            setEmail(emailParam);
            setShowWelcome(true);
        }

        if (verifiedParam === 'true') {
            setEmailVerified(true);
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setShowResend(false);
        setResendSuccess(false);

        const formData = new FormData(e.currentTarget);
        const result = await login(formData);

        if (result?.error) {
            setError(result.error);
            // Check if error is about email not confirmed
            if (result.error.toLowerCase().includes('not confirmed') ||
                result.error.toLowerCase().includes('email not verified') ||
                result.error.toLowerCase().includes('email confirmation')) {
                setShowResend(true);
            }
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!email) {
            setError('请先输入邮箱地址');
            return;
        }

        setResending(true);
        setResendSuccess(false);

        const result = await resendVerification(email);

        setResending(false);

        if (result.error) {
            setError(result.error);
        } else {
            setResendSuccess(true);
            setError(null);
        }
    };

    return (
        <>
            {showWelcome && (
                <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl flex items-start text-green-700">
                    <CheckCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-bold mb-1">注册成功！</p>
                        <p>请先到邮箱确认后再登录。邮箱已自动填入。</p>
                    </div>
                </div>
            )}

            {emailVerified && (
                <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl flex items-start text-green-700">
                    <CheckCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-bold mb-1">邮箱确认成功！</p>
                        <p>您的邮箱已验证，请登录您的账号。</p>
                    </div>
                </div>
            )}

            {resendSuccess && (
                <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl flex items-start text-green-700">
                    <CheckCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-bold mb-1">验证邮件已发送！</p>
                        <p>请检查您的邮箱 <strong>{email}</strong> 并点击验证链接。</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl">
                    <div className="flex items-center text-red-600 mb-2">
                        <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                        <span className="text-sm">{error}</span>
                    </div>
                    {showResend && (
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={resending}
                            className="mt-2 w-full py-2 px-4 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200 transition flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <RefreshCw size={14} className={resending ? 'animate-spin' : ''} />
                            {resending ? '发送中...' : '重新发送验证邮件'}
                        </button>
                    )}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">邮箱地址</label>
                    <div className="relative">
                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            name="email"
                            type="email"
                            required
                            placeholder="your@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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
                            placeholder="••••••••"
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <label className="flex items-center cursor-pointer select-none">
                        <input
                            type="checkbox"
                            name="rememberMe"
                            className="w-4 h-4 text-indigo-600 bg-gray-50 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <span className="ml-2 text-sm text-gray-600">自动登录</span>
                    </label>
                    <Link href="/auth/forgot-password" className="text-sm text-indigo-600 font-medium hover:underline">
                        忘记密码？
                    </Link>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? '登录中...' : '登录'}
                </button>
            </form>

            <div className="mt-8 text-center text-sm text-gray-500">
                还没有账号？{' '}
                <Link href="/auth/signup" className="text-indigo-600 font-bold hover:underline">
                    立即注册
                </Link>
            </div>
        </>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-10">
                    <div className="text-center mb-8">
                        <div className="inline-block p-3 bg-indigo-100 text-indigo-600 rounded-2xl mb-4">
                            <LogIn size={28} />
                        </div>
                        <h1 className="text-2xl font-extrabold text-gray-900">欢迎回来</h1>
                        <p className="text-gray-500 mt-2">登录您的账号</p>
                    </div>

                    <Suspense fallback={<div className="text-center py-8 text-gray-400">加载中...</div>}>
                        <LoginForm />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}

