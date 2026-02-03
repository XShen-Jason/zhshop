'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, FileText, Flame, Eye } from 'lucide-react';
import { useToast } from '@/lib/GlobalToast';
import { useConfirm } from '@/lib/ConfirmContext';
import MarkdownEditor from '@/components/MarkdownEditor';
import type { Tutorial } from '@/types';

export default function AdminTutorialsPage() {
    const [tutorials, setTutorials] = useState<Tutorial[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Partial<Tutorial> | null>(null);
    const { showToast } = useToast();
    const { confirm } = useConfirm();

    useEffect(() => {
        fetchTutorials();
    }, []);

    const fetchTutorials = async () => {
        try {
            const res = await fetch('/api/tutorials');
            if (res.ok) setTutorials(await res.json());
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editing) return;

        try {
            const res = await fetch('/api/tutorials', {
                method: editing.id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editing)
            });
            if (res.ok) {
                showToast(editing.id ? '教程已更新' : '教程已创建', 'success');
                setShowModal(false);
                setEditing(null);
                fetchTutorials();
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirm({
            title: '确认删除',
            message: '确定要删除此教程吗？',
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
                showToast('教程已删除', 'success');
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold">教程管理</h2>
                <button
                    onClick={() => { setEditing({}); setShowModal(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
                >
                    <Plus size={16} /> 新增教程
                </button>
            </div>

            {/* Tutorials Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tutorials.map(tutorial => (
                    <div key={tutorial.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                        {tutorial.imageUrl && (
                            <img src={tutorial.imageUrl} alt="" className="w-full h-32 object-cover" />
                        )}
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                        {tutorial.title}
                                        {tutorial.isHot && <Flame size={14} className="text-orange-500" />}
                                    </h4>
                                    <p className="text-xs text-gray-500">{tutorial.category}</p>
                                </div>
                            </div>
                            <p className="text-xs text-gray-600 line-clamp-2 mb-3">{tutorial.description}</p>
                            <div className="flex gap-2">
                                <a href={`/tutorials/${tutorial.id}`} target="_blank" className="p-1.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200">
                                    <Eye size={14} />
                                </a>
                                <button onClick={() => toggleHot(tutorial.id, tutorial.isHot || false)} className={`p-1.5 rounded ${tutorial.isHot ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
                                    <Flame size={14} />
                                </button>
                                <button onClick={() => { setEditing(tutorial); setShowModal(true); }} className="p-1.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200">
                                    <Edit size={14} />
                                </button>
                                <button onClick={() => handleDelete(tutorial.id)} className="p-1.5 rounded bg-gray-100 text-red-500 hover:bg-red-50">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {tutorials.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                    <FileText size={48} className="mx-auto mb-4" />
                    <p>暂无教程</p>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <h3 className="font-bold text-lg">{editing?.id ? '编辑教程' : '新增教程'}</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                                    <input type="text" value={editing?.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                                    <input type="text" value={editing?.category || ''} onChange={e => setEditing({ ...editing, category: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">封面图片URL</label>
                                <input type="url" value={editing?.imageUrl || ''} onChange={e => setEditing({ ...editing, imageUrl: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                                <textarea value={editing?.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">内容 (Markdown)</label>
                                <MarkdownEditor
                                    value={editing?.content || ''}
                                    onChange={content => setEditing({ ...editing, content })}
                                    placeholder="支持 Markdown 格式..."
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">取消</button>
                                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">保存</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
