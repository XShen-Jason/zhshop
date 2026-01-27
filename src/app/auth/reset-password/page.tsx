'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Lock, KeyRound, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { resetPassword } from '../actions';

export default function ResetPasswordPage() {
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const password = formData.get('password') as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        if (password !== confirmPassword) {
            setError('两次输入的密码不一致');
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('密码长度至少为6位');
            setLoading(false);
            return;
        }

        const result = await resetPassword(formData);

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
                        <div className="inline-block p-3 bg-emerald-100 text-emerald-600 rounded-2xl mb-4">
                            <KeyRound size={28} />
                        </div>
                        <h1 className="text-2xl font-extrabold text-gray-900">设置新密码</h1>
                        <p className="text-gray-500 mt-2">请输入您的新密码</p>
                    </div>

                    {success ? (
                        <div className="text-center">
                            <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl flex items-start text-green-700">
                                <CheckCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-left">
                                    <p className="font-bold mb-1">密码已更新！</p>
                                    <p>您现在可以使用新密码登录了。</p>
                                </div>
                            </div>
                            <Link
                                href="/auth/login"
                                className="inline-flex items-center justify-center w-full py-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95"
                            >
                                前往登录
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
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">新密码</label>
                                    <div className="relative">
                                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            name="password"
                                            type="password"
                                            required
                                            placeholder="••••••••"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">确认新密码</label>
                                    <div className="relative">
                                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            name="confirmPassword"
                                            type="password"
                                            required
                                            placeholder="••••••••"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? '更新中...' : '更新密码'}
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
