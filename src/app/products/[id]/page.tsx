'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, BookOpen, ArrowRight, Minus, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Product } from '@/types';

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [contact, setContact] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Prevent duplicate fetches (React StrictMode, fast re-renders)
    const fetchingRef = useRef(false);

    const fetchProduct = useCallback(async (productId: string) => {
        if (fetchingRef.current) return;
        fetchingRef.current = true;

        try {
            const res = await fetch(`/api/products/${productId}`);
            if (res.ok) {
                const data = await res.json();
                setProduct(data);
            } else {
                router.replace('/products');
            }
        } catch (error) {
            console.error('Error fetching product:', error);
        } finally {
            setLoading(false);
            fetchingRef.current = false;
        }
    }, []);

    useEffect(() => {
        if (params.id) fetchProduct(params.id as string);
    }, [params.id, fetchProduct]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product) return;

        setSubmitting(true);
        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemId: product.id,
                    itemType: 'PRODUCT',
                    itemName: product.title,
                    contact,
                    cost: product.price * quantity,
                    currency: 'CNY',
                    quantity
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.payUrl) {
                    // Redirect to payment page
                    window.location.href = data.payUrl;
                    return;
                }
                if (data.paymentError) {
                    alert(`订单已创建，但支付启动失败: ${data.paymentError}`);
                    // Still show submitted state so they confirm the order exists locally
                }
                setSubmitted(true);
            } else {
                const errorData = await res.json();
                alert(errorData.error || '订单提交失败');
                // Update stock display if available
                if (errorData.availableStock !== undefined) {
                    setProduct(prev => prev ? { ...prev, stock: errorData.availableStock } : null);
                    setQuantity(Math.min(quantity, errorData.availableStock || 1));
                }
            }
        } catch (error) {
            console.error('Error creating order:', error);
            alert('网络错误，请重试');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <p className="text-gray-500">商品不存在，正在跳转...</p>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
                <div className="p-10 max-w-lg w-full text-center bg-white rounded-3xl shadow-xl border border-gray-100">
                    <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
                        <CheckCircle className="text-green-600" size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">提交成功!</h2>
                    <p className="text-gray-600 mb-8 leading-relaxed">
                        管理员将尽快通过 <strong>{contact}</strong> 联系您确认订单详情，请留意消息。
                    </p>
                    <button onClick={() => router.push('/products')} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-indigo-700 transition">返回商店</button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-900 mb-6 flex items-center transition-colors">
                <ArrowRight className="rotate-180 mr-2" size={16} /> 返回列表
            </button>
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden md:flex min-h-[500px]">
                <div className="p-8 md:p-12 md:w-3/5 flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{product.category}</span>
                        <Badge status={product.inStock ? '有货' : '无货'} />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">{product.title}</h1>
                    <div className="flex items-center gap-4 mb-8">
                        <span className="text-3xl font-bold text-indigo-600">¥{product.price}</span>
                        {product.stock !== undefined && (
                            <span className={`text-sm px-3 py-1 rounded-full ${product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {product.stock > 0 ? `库存: ${product.stock}` : '已售罄'}
                            </span>
                        )}
                    </div>

                    <div className="space-y-8 flex-1">
                        <div>
                            <h3 className="font-bold text-gray-900 mb-3 text-lg">商品描述</h3>
                            <p className="text-gray-600 leading-relaxed text-lg">{product.description}</p>
                        </div>
                        <div className="bg-gray-50 p-6 rounded-2xl">
                            <h3 className="font-bold text-gray-900 mb-4">规格与特性</h3>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {(product.features || []).map((f, i) => (
                                    <li key={i} className="flex items-center text-gray-700">
                                        <CheckCircle size={18} className="mr-3 text-green-500 flex-shrink-0" /> {f}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50/50 p-8 md:p-12 md:w-2/5 border-l border-gray-100 flex flex-col justify-center">
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-xl text-gray-900 mb-6">购买意向</h3>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                                    数量 {typeof product.stock === 'number' && <span className="text-gray-400 font-normal">(剩余库存: {product.stock})</span>}
                                </label>
                                <div className="flex items-center justify-center bg-gray-50 border border-gray-200 rounded-xl p-2">
                                    <button
                                        type="button"
                                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                        className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
                                    >
                                        <Minus size={16} />
                                    </button>
                                    <input
                                        type="number"
                                        min="1"
                                        max={typeof product.stock === 'number' ? product.stock : 999}
                                        value={quantity}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value, 10);
                                            if (!isNaN(val) && val >= 1) {
                                                const maxStock = typeof product.stock === 'number' ? product.stock : 999;
                                                setQuantity(Math.min(maxStock, val));
                                            }
                                        }}
                                        className="mx-2 w-16 text-center text-xl font-bold text-gray-900 bg-transparent border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setQuantity(q => {
                                            const maxStock = typeof product.stock === 'number' ? product.stock : 999;
                                            return Math.min(maxStock, q + 1);
                                        })}
                                        disabled={typeof product.stock === 'number' && quantity >= product.stock}
                                        className={`w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center transition ${typeof product.stock === 'number' && quantity >= product.stock ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                                <p className="text-center text-lg font-bold text-indigo-600 mt-2">总计: ¥{(product.price * quantity).toFixed(2)}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">联系方式</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Telegram 用户名 / 邮箱"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                                    value={contact}
                                    onChange={(e) => setContact(e.target.value)}
                                />
                                <p className="text-xs text-gray-400 mt-2">管理员将通过此方式与您联系发货。</p>
                            </div>
                            <button
                                type="submit"
                                disabled={!product.inStock || (product.stock !== undefined && product.stock <= 0) || submitting}
                                className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center ${product.inStock && (product.stock === undefined || product.stock > 0) && !submitting ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-gray-400 cursor-not-allowed'}`}
                            >
                                {submitting ? '提交中...' : (product.inStock && (product.stock === undefined || product.stock > 0)) ? '提交订单' : '暂时缺货'}
                            </button>
                        </form>
                    </div>
                    {product.tutorialId && (
                        <div className="mt-8 text-center">
                            <p className="text-sm text-gray-500 mb-3">需要使用帮助?</p>
                            <Link href={`/tutorials/${product.tutorialId}`} className="text-sm text-indigo-600 font-bold hover:underline flex items-center justify-center mx-auto bg-indigo-50 px-4 py-2 rounded-lg">
                                <BookOpen size={16} className="mr-2" /> 查看相关教程
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
