'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, FileText, Flame, Eye, Search, X, Check, ChevronDown } from 'lucide-react';
import { useToast } from '@/lib/GlobalToast';
import { useConfirm } from '@/lib/ConfirmContext';
import MarkdownEditor from '@/components/MarkdownEditor';
import type { Tutorial } from '@/types';

// ==========================================
// Types & Constants
// ==========================================
type PrimaryCategory = '教程' | '活动';
const PRIMARY_CATEGORIES: PrimaryCategory[] = ['教程', '活动'];

// ==========================================
// Components
// ==========================================

// --- Tag Input Component ---
interface TagInputProps {
    value: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
}

function TagInput({ value, onChange, placeholder = '输入标签后回车...' }: TagInputProps) {
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag();
        } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
            removeTag(value.length - 1);
        }
    };

    const addTag = () => {
        const tag = inputValue.trim();
        if (tag && !value.includes(tag)) {
            onChange([...value, tag]);
            setInputValue('');
        }
    };

    const removeTag = (index: number) => {
        onChange(value.filter((_, i) => i !== index));
    };

    return (
        <div
            className="flex flex-wrap gap-2 p-2 border border-gray-200 rounded-lg bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all cursor-text"
            onClick={() => inputRef.current?.focus()}
        >
            {value.map((tag, index) => (
                <span key={index} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-nowrap">
                    {tag}
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeTag(index); }}
                        className="hover:text-indigo-900 focus:outline-none"
                    >
                        <X size={12} />
                    </button>
                </span>
            ))}
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={addTag}
                placeholder={value.length === 0 ? placeholder : ''}
                className="flex-1 min-w-[120px] outline-none text-sm bg-transparent placeholder:text-gray-400"
            />
        </div>
    );
}

// --- Status Badge ---
function CategoryBadge({ category }: { category: string }) {
    const isActivity = category === '活动';
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${isActivity
            ? 'bg-purple-50 text-purple-700 border-purple-100'
            : 'bg-blue-50 text-blue-700 border-blue-100'
            }`}>
            {isActivity ? '🎉 活动' : '📖 教程'}
        </span>
    );
}

// ==========================================
// Main Page Component
// ==========================================
export default function AdminContentPage() {
    const [tutorials, setTutorials] = useState<Tutorial[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Partial<Tutorial> | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { showToast } = useToast();
    const { confirm } = useConfirm();

    useEffect(() => {
        fetchTutorials();
    }, []);

    const fetchTutorials = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/tutorials');
            if (res.ok) setTutorials(await res.json());
        } catch (error) {
            console.error('Error:', error);
            showToast('获取数据失败', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editing) return;

        // Ensure category is set (default to 教程 if missing)
        const payload = {
            ...editing,
            category: editing.category || '教程'
        };

        try {
            const res = await fetch('/api/tutorials', {
                method: editing.id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                showToast(editing.id ? '已更新' : '已创建', 'success');
                setShowModal(false);
                setEditing(null);
                fetchTutorials();
            } else {
                showToast('保存失败', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirm({
            title: '确认删除',
            message: '确定要删除此内容吗？删除后无法恢复。',
            confirmText: '删除',
            cancelText: '取消'
        });
        if (!confirmed) return;

        try {
            const res = await fetch('/api/tutorials', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (res.ok) {
                showToast('已删除', 'success');
                fetchTutorials();
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const toggleHot = async (id: string, currentIsHot: boolean) => {
        try {
            const res = await fetch('/api/tutorials', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isHot: !currentIsHot })
            });
            if (res.ok) fetchTutorials();
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const filteredTutorials = tutorials.filter(t =>
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.includes(searchTerm) ||
        (t.tags || []).some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading && tutorials.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">内容管理</h1>
                    <p className="text-sm text-gray-500 mt-1">管理平台的教程与活动内容，支持富文本与 H5 自定义。</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="搜索标题、标签..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-full md:w-64 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                    </div>
                    <button
                        onClick={() => { setEditing({ category: '教程', tags: [], format: 'md' }); setShowModal(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all active:scale-95 whitespace-nowrap"
                    >
                        <Plus size={18} /> 新增内容
                    </button>
                </div>
            </div>

            {/* H5 Guidelines Alert (Collapsible or compact?) - Keeping it but verified styling */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/50 rounded-xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                    <div className="text-2xl">💡</div>
                    <div className="flex-1">
                        <h3 className="text-blue-900 font-bold text-sm mb-1">H5 内容发布规范 (V3.0)</h3>
                        <div className="text-xs text-blue-700 leading-relaxed mb-2 space-y-1">
                            <p>1. <strong>根容器</strong>：必须包含 <code>w-full relative rounded-xl overflow-hidden isolation-auto</code>。</p>
                            <p>2. <strong>严禁使用</strong>：<code>fixed</code> (固定定位)、<code>w-screen/h-screen</code> (视口单位)。</p>
                            <p>3. <strong>防溢出</strong>：内部元素宽度请勿超过 100%，图片建议添加 <code>max-w-full</code>。</p>
                        </div>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(`<div class="w-full relative rounded-xl overflow-hidden bg-white isolation-auto">\n  <!-- 内容区域 -->\n  <div class="max-w-full">\n    <!-- 你的代码 -->\n  </div>\n</div>`);
                                showToast('V3.0 标准模板已复制', 'success');
                            }}
                            className="text-xs bg-white text-blue-600 border border-blue-200 px-3 py-1.5 rounded-md hover:bg-blue-50 transition-colors font-medium"
                        >
                            复制 V3.0 标准防溢出模板
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTutorials.map(item => (
                    <div key={item.id} className="group bg-white rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden hover:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.1)] hover:border-indigo-100 transition-all duration-300 flex flex-col h-full">
                        {/* Image / Cover */}
                        <div className="aspect-video w-full bg-gray-100 relative overflow-hidden">
                            {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    <FileText size={48} />
                                </div>
                            )}
                            <div className="absolute top-3 left-3 flex gap-2">
                                <CategoryBadge category={item.category} />
                                {item.isHot && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-orange-500 text-white shadow-sm whitespace-nowrap">
                                        <Flame size={10} fill="currentColor" /> 热推
                                    </span>
                                )}
                            </div>
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a href={`/tutorials/${item.id}`} target="_blank" className="p-2 bg-white/90 backdrop-blur text-gray-700 rounded-full hover:bg-white shadow-sm block">
                                    <Eye size={16} />
                                </a>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-5 flex-1 flex flex-col">
                            <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                {item.title}
                            </h3>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {item.tags && item.tags.filter(t => t !== 'html-mode').length > 0 ? (
                                    item.tags.filter(t => t !== 'html-mode').map((tag, i) => (
                                        <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500 border border-gray-200 whitespace-nowrap">
                                            {tag}
                                        </span>
                                    ))
                                ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] bg-gray-50 text-gray-300 border border-transparent border-dashed border-gray-200">
                                        无标签
                                    </span>
                                )}
                            </div>

                            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-4 flex-1">
                                {item.summary || (item.content ? item.content.slice(0, 60) + '...' : '暂无描述')}
                            </p>

                            {/* Actions */}
                            <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
                                <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <button
                                        onClick={() => toggleHot(item.id, item.isHot || false)}
                                        className={`p-1.5 rounded-md hover:bg-gray-100 transition-colors ${item.isHot ? 'text-orange-500' : 'text-gray-400'}`}
                                        title={item.isHot ? "取消热推" : "设为热推"}
                                    >
                                        <Flame size={16} />
                                    </button>
                                    <button
                                        onClick={() => { setEditing(item); setShowModal(true); }}
                                        className="p-1.5 rounded-md hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
                                        title="编辑"
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                        title="删除"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredTutorials.length === 0 && !loading && (
                <div className="text-center py-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
                    <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-400 text-sm">暂无匹配内容</p>
                    <button
                        onClick={() => { setEditing({ category: '教程', tags: [], format: 'md' }); setShowModal(true); }}
                        className="mt-4 px-4 py-2 text-indigo-600 font-medium text-sm hover:underline"
                    >
                        创建一个？
                    </button>
                </div>
            )}

            {/* Edit/Create Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" onClick={() => setShowModal(false)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />
                    <div
                        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                {editing?.id ? <Edit size={18} className="text-indigo-500" /> : <Plus size={18} className="text-indigo-500" />}
                                {editing?.id ? '编辑内容' : '新增内容'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Title & Image */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">标题 <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={editing?.title || ''}
                                        onChange={e => setEditing({ ...editing, title: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                        placeholder="输入吸引人的标题"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">封面图片 URL</label>
                                    <input
                                        type="url"
                                        value={editing?.imageUrl || ''}
                                        onChange={e => setEditing({ ...editing, imageUrl: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>

                            {/* Classification */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Primary Category - Fixed Selection */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">一级分类 (类型)</label>
                                    <div className="flex bg-gray-100 p-1 rounded-lg">
                                        {PRIMARY_CATEGORIES.map(cat => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => setEditing({ ...editing, category: cat })}
                                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${editing?.category === cat
                                                    ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5'
                                                    : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Secondary Category - Tag Input */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">二级分类 (标签)</label>
                                    <TagInput
                                        value={(editing?.tags || []).filter(t => t !== 'html-mode')}
                                        onChange={(newTags) => {
                                            // Preserve html-mode if it exists in original but isn't visible? 
                                            // Actually backend handles re-adding it if format is html.
                                            // So we just send the user-defined tags.
                                            setEditing({ ...editing, tags: newTags });
                                        }}
                                        placeholder="输入标签，按回车添加..."
                                    />
                                </div>
                            </div>

                            {/* Format & Description */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-semibold text-gray-700">内容格式</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${!editing?.format || editing?.format === 'md' ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
                                                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                            </div>
                                            <input type="radio" className="hidden" name="format" value="md" checked={!editing?.format || editing?.format === 'md'} onChange={() => setEditing({ ...editing, format: 'md' })} />
                                            <span className="text-sm text-gray-600 group-hover:text-gray-900">Markdown</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${editing?.format === 'html' ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
                                                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                            </div>
                                            <input type="radio" className="hidden" name="format" value="html" checked={editing?.format === 'html'} onChange={() => setEditing({ ...editing, format: 'html' })} />
                                            <span className="text-sm text-gray-600 group-hover:text-gray-900">HTML</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">简短描述</label>
                                <textarea
                                    value={editing?.summary || ''}
                                    onChange={e => setEditing({ ...editing, summary: e.target.value })}
                                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                    rows={2}
                                    placeholder="用于列表卡片显示的简短介绍..."
                                />
                            </div>

                            {/* Editor */}
                            <div className="flex-1 min-h-[400px]">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">详细内容</label>
                                <div className="border border-gray-200 rounded-lg overflow-hidden h-full">
                                    <MarkdownEditor
                                        value={editing?.content || ''}
                                        onChange={content => setEditing({ ...editing, content })}
                                        format={editing?.format || 'md'}
                                        placeholder={editing?.format === 'html' ? "</div>... (请粘贴HTML代码)" : "# 标题\n\n正文内容..."}
                                    />
                                </div>
                            </div>
                        </form>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={(e) => handleSave(e as any)}
                                className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all active:scale-95"
                            >
                                {editing?.id ? '保存修改' : '立即发布'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
