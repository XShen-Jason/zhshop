'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Tutorial } from '@/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';

export default function TutorialDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [tutorial, setTutorial] = useState<Tutorial | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchTutorial() {
            try {
                const res = await fetch(`/api/tutorials/${params.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setTutorial(data);
                }
            } catch (error) {
                console.error('Error fetching tutorial:', error);
            } finally {
                setLoading(false);
            }
        }
        if (params.id) fetchTutorial();
    }, [params.id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!tutorial) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <p className="text-gray-500">教程不存在</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-900 mb-6 flex items-center transition-colors">
                <ArrowRight className="rotate-180 mr-2" size={16} /> 返回列表
            </button>
            <article className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden p-8 md:p-12">
                <div className="flex gap-2 mb-6 flex-wrap">
                    {(tutorial.tags || []).map(tag => (
                        <span key={tag} className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">{tag}</span>
                    ))}
                </div>
                <h1 className="text-3xl font-extrabold text-gray-900 mb-4">{tutorial.title}</h1>
                <p className="text-gray-500 mb-8">更新于: {tutorial.updatedAt?.split('T')[0]}</p>

                <div className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-indigo-600 prose-img:rounded-xl prose-img:shadow-md">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                    >
                        {tutorial.content || ''}
                    </ReactMarkdown>
                </div>
            </article>
        </div>
    );
}

