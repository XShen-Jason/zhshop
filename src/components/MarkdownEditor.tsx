'use client';

import React, { useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { ImageIcon, Eye, Edit3, Upload } from 'lucide-react';
import { useToast } from '@/lib/GlobalToast';

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    minHeight?: string;
}

export default function MarkdownEditor({
    value,
    onChange,
    placeholder = '支持 Markdown 语法，可直接粘贴图片...',
    minHeight = '400px'
}: MarkdownEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [uploading, setUploading] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);
    const { showToast } = useToast();

    // Handle paste event for images
    const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    await uploadImage(file);
                }
                return;
            }
        }
    }, []);

    // Handle file drop
    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        const files = e.dataTransfer?.files;
        if (!files) return;

        for (const file of Array.from(files)) {
            if (file.type.startsWith('image/')) {
                await uploadImage(file);
            }
        }
    }, []);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    // Upload image and insert markdown
    const uploadImage = async (file: File) => {
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const { url } = await res.json();
                insertAtCursor(`![${file.name}](${url})`);
            } else {
                const error = await res.json();
                showToast(error.error || '图片上传失败', 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            showToast('图片上传失败，请稍后重试', 'error');
        } finally {
            setUploading(false);
        }
    };

    // Insert text at cursor position
    const insertAtCursor = (text: string) => {
        const textarea = textareaRef.current;
        if (!textarea) {
            onChange(value + text);
            return;
        }

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = value.substring(0, start) + text + value.substring(end);
        onChange(newValue);

        // Restore cursor position after text
        setTimeout(() => {
            textarea.focus();
            textarea.selectionStart = textarea.selectionEnd = start + text.length;
        }, 0);
    };

    // Handle file input click
    const handleFileClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                await uploadImage(file);
            }
        };
        input.click();
    };

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleFileClick}
                        disabled={uploading}
                        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition"
                        title="上传图片"
                    >
                        <ImageIcon size={18} />
                    </button>
                    {uploading && (
                        <span className="text-xs text-indigo-600 flex items-center">
                            <Upload size={14} className="mr-1 animate-bounce" /> 上传中...
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setPreviewMode(false)}
                        className={`px-2 py-1 text-xs rounded flex items-center ${!previewMode ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        <Edit3 size={14} className="mr-1" /> 编辑
                    </button>
                    <button
                        type="button"
                        onClick={() => setPreviewMode(true)}
                        className={`px-2 py-1 text-xs rounded flex items-center ${previewMode ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        <Eye size={14} className="mr-1" /> 预览
                    </button>
                </div>
            </div>

            {/* Editor / Preview */}
            <div style={{ minHeight }}>
                {previewMode ? (
                    <div className="p-4 prose prose-sm max-w-none overflow-y-auto" style={{ minHeight }}>
                        {value ? (
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeHighlight]}
                            >
                                {value}
                            </ReactMarkdown>
                        ) : (
                            <p className="text-gray-400">没有内容可预览</p>
                        )}
                    </div>
                ) : (
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onPaste={handlePaste}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        placeholder={placeholder}
                        className="w-full p-4 font-mono text-sm resize-none outline-none"
                        style={{ minHeight }}
                    />
                )}
            </div>

            {/* Help text */}
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
                支持 Markdown 语法 • 直接粘贴或拖放图片上传 • 支持代码高亮
            </div>
        </div>
    );
}
