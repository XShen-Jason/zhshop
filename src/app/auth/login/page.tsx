'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Mail, Lock, LogIn, AlertCircle, CheckCircle } from 'lucide-react';
import { login } from '../actions';

function LoginForm() {
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [showWelcome, setShowWelcome] = useState(false);

    // 从 URL 获取预填的 email
    useEffect(() => {
        const emailParam = searchParams.get('email');
        if (emailParam) {
            setEmail(emailParam);
            setShowWelcome(true);
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const result = await login(formData);

        if (result?.error) {
            setError(result.error);
            setLoading(false);
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

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center text-red-600">
                    <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
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
