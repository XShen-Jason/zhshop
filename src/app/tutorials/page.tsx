'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Tutorial } from '@/types';

export default function TutorialsPage() {
    const [tutorials, setTutorials] = useState<Tutorial[]>([]);
    const [loading, setLoading] = useState(true);

    // Prevent duplicate fetches (React StrictMode, fast re-renders)
    const fetchingRef = useRef(false);

    const fetchTutorials = useCallback(async () => {
        if (fetchingRef.current) return;
        fetchingRef.current = true;

        try {
            const res = await fetch('/api/tutorials');
            if (res.ok) {
                const data = await res.json();
                setTutorials(data);
            }
        } catch (error) {
            console.error('Error fetching tutorials:', error);
        } finally {
            setLoading(false);
            fetchingRef.current = false;
        }
    }, []);

    useEffect(() => {
        fetchTutorials();
    }, [fetchTutorials]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto min-h-screen">
            <div className="mb-12 text-center">
                <div className="inline-block p-3 bg-blue-100 text-blue-600 rounded-2xl mb-4">
                    <BookOpen size={32} />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2">教程指南</h2>
                <p className="text-gray-500">学习技巧，解锁更多可能性</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {tutorials.map(t => (
                    <Link key={t.id} href={`/tutorials/${t.id}`}>
                        <Card className="group h-full">
                            <div className="p-8 cursor-pointer">
                                <div className="flex gap-2 mb-4 flex-wrap">
                                    {(t.tags || []).map(tag => (
                                        <span key={tag} className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">{tag}</span>
                                    ))}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-indigo-600 transition-colors">{t.title}</h3>
                                <p className="text-gray-500 leading-relaxed mb-4">{t.summary}</p>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-400">更新于: {t.updatedAt?.split('T')[0]}</span>
                                    <span className="text-indigo-600 font-medium group-hover:underline">阅读全文 →</span>
                                </div>
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>

            {tutorials.length === 0 && (
                <div className="text-center py-20 text-gray-500">
                    暂无教程
                </div>
            )}
        </div>
    );
}
