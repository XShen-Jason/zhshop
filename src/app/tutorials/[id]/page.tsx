'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Tutorial } from '@/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/atom-one-dark.css';

import { ShareButton } from '@/components/ui/ShareButton';

// Alert Helper Component
const AlertBlock = ({ type, children }: { type: string, children: React.ReactNode }) => {
    const styles = {
        NOTE: { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-800', icon: 'ℹ️' },
        TIP: { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-800', icon: '💡' },
        IMPORTANT: { bg: 'bg-indigo-50', border: 'border-indigo-500', text: 'text-indigo-800', icon: '📢' },
        WARNING: { bg: 'bg-amber-50', border: 'border-amber-500', text: 'text-amber-800', icon: '⚠️' },
        CAUTION: { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-800', icon: '🚨' },
    };
    const style = styles[type as keyof typeof styles] || styles.NOTE;

    return (
        <div className={`my-4 p-4 rounded-lg border-l-4 ${style.bg} ${style.border} ${style.text}`}>
            <div className="font-bold mb-1 flex items-center gap-2">
                <span>{style.icon}</span>
                {type}
            </div>
            <div className="text-sm opacity-90">{children}</div>
        </div>
    );
};

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

    // Extract raw text from markdown/html for share preview (simple strip)
    const shareText = tutorial.format === 'html'
        ? tutorial.content.replace(/<[^>]+>/g, '').slice(0, 50)
        : tutorial.content.slice(0, 50);

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-900 flex items-center transition-colors">
                    <ArrowRight className="rotate-180 mr-2" size={16} /> 返回列表
                </button>
                <ShareButton title={tutorial.title} text={`${shareText}...`} />
            </div>

            <article className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden p-8 md:p-12">
                <div className="flex gap-2 mb-6 flex-wrap">
                    {(tutorial.tags || []).filter(tag => tag !== 'html-mode').map(tag => (
                        <span key={tag} className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">{tag}</span>
                    ))}
                </div>
                <h1 className="text-3xl font-extrabold text-gray-900 mb-4">{tutorial.title}</h1>
                <p className="text-gray-500 mb-8">更新于: {tutorial.updatedAt?.split('T')[0]}</p>

                {tutorial.format === 'html' ? (
                    <div className="w-full" dangerouslySetInnerHTML={{ __html: tutorial.content }} />
                ) : (
                    <div className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-indigo-600 prose-img:rounded-xl prose-img:shadow-md prose-pre:bg-[#282c34] prose-pre:text-gray-100">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                            components={{
                                blockquote: ({ node, children, ...props }) => {
                                    // Extract text content to check for alert syntax
                                    // ReactMarkdown structure is complex, simplified check:
                                    const content = React.Children.toArray(children);
                                    const firstChild = content[0] as any;

                                    // Check if first child is a paragraph with alert text
                                    if (firstChild?.props?.node?.tagName === 'p') {
                                        const pText = firstChild.props.children?.[0];
                                        if (typeof pText === 'string') {
                                            const match = pText.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/);
                                            if (match) {
                                                const type = match[1];
                                                // Eliminate the trigger text from the first paragraph
                                                const cleanChildren = React.Children.map(content, (child, index) => {
                                                    if (index === 0 && React.isValidElement(child)) {
                                                        const grandChildren = React.Children.toArray((child as any).props.children);
                                                        // Remove the first text node if it matches or replace it
                                                        if (typeof grandChildren[0] === 'string' && grandChildren[0].startsWith(match[0])) {
                                                            const newText = grandChildren[0].replace(match[0], '').trim();
                                                            // Update the paragraph's children. If text empty, maybe remove? 
                                                            // For simplicity, just return rest.
                                                            if (!newText && grandChildren.length === 1) return null; // empty P

                                                            // Reconstruct P without the tag
                                                            return React.cloneElement(child as React.ReactElement<any>, {}, [newText, ...grandChildren.slice(1)]);
                                                        }
                                                    }
                                                    return child;
                                                });

                                                // Filter nulls
                                                const finalChildren = (cleanChildren || []).filter(Boolean);

                                                return <AlertBlock type={type}>{finalChildren}</AlertBlock>;
                                            }
                                        }
                                    }
                                    return <blockquote {...props} className="border-l-4 border-gray-300 pl-4 py-1 my-4 italic bg-gray-50">{children}</blockquote>;
                                }
                            }}
                        >
                            {tutorial.content || ''}
                        </ReactMarkdown>
                    </div>
                )}
            </article>
        </div>
    );
}
