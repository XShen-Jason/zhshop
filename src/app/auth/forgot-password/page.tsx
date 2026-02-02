'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, KeyRound, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { forgotPassword } from '../actions';

export default function ForgotPasswordPage() {
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const result = await forgotPassword(formData);

        if (result?.error) {
            setError(result.error);
            setLoading(false);
        } else if (result?.success) {
            setSuccess(true);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-10">
                    <div className="text-center mb-8">
                        <div className="inline-block p-3 bg-amber-100 text-amber-600 rounded-2xl mb-4">
                            <KeyRound size={28} />
                        </div>
                        <h1 className="text-2xl font-extrabold text-gray-900">找回密码</h1>
                        <p className="text-gray-500 mt-2">输入您的邮箱，我们将发送重置链接</p>
                    </div>

                    {success ? (
                        <div className="text-center">
                            <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl flex items-start text-green-700">
                                <CheckCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-left">
                                    <p className="font-bold mb-1">邮件已发送！</p>
                                    <p>请检查您的邮箱（包括垃圾邮件），点击链接重置密码。</p>
                                </div>
                            </div>
                            <Link
                                href="/auth/login"
                                className="inline-flex items-center text-indigo-600 font-bold hover:underline"
                            >
                                <ArrowLeft size={16} className="mr-1" />
                                返回登录
                            </Link>
                        </div>
                    ) : (
                        <>
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
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 rounded-xl font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? '发送中...' : '发送重置链接'}
                                </button>
                            </form>

                            <div className="mt-8 text-center text-sm text-gray-500">
                                <Link href="/auth/login" className="inline-flex items-center text-indigo-600 font-bold hover:underline">
                                    <ArrowLeft size={16} className="mr-1" />
                                    返回登录
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
