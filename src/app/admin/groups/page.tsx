'use client';

import React, { useState, useEffect } from 'react';
import {
    Plus, Edit, Trash2, Users, Lock, Unlock, Flame, Repeat,
    Eye, AlertCircle, ChevronDown, ChevronRight, ChevronUp, Save, X,
    Phone, Mail, Check, Calendar, User as UserIcon, Clock
} from 'lucide-react';
import { useToast } from '@/lib/GlobalToast';
import { useConfirm } from '@/lib/ConfirmContext';
import { formatBeijing } from '@/lib/timezone';
import { type GroupBuy, GroupStatus } from '@/types'; // Using global types

// Extended Participant Interface based on API response
interface GroupParticipant {
    id: string; // userId or unique key
    userId: string;
    contact: string;
    joinedAt: string;
    quantity: number;
    name?: string;
    users?: {
        email: string;
        name: string;
        saved_contacts?: { type: string, value: string }[];
    };
    savedContacts?: { type: string, value: string }[];
}

export default function AdminGroupsPage() {
    // --- State ---
    const [groups, setGroups] = useState<GroupBuy[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Partial<GroupBuy> | null>(null);

    const [showParticipantsModal, setShowParticipantsModal] = useState(false);
    const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
    const [participants, setParticipants] = useState<GroupParticipant[]>([]);
    const [loadingParticipants, setLoadingParticipants] = useState(false);

    const { showToast } = useToast();
    const { confirm } = useConfirm();

    // --- Effects ---
    useEffect(() => {
        fetchGroups();
    }, []);

    // --- Actions ---
    const fetchGroups = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/groups');
            if (res.ok) setGroups(await res.json());
        } catch (error) {
            console.error('Error:', error);
            showToast('获取拼团列表失败', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingGroup) return;

        try {
            const res = await fetch('/api/groups', {
                method: editingGroup.id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingGroup)
            });
            if (res.ok) {
                showToast(editingGroup.id ? '拼团已更新' : '拼团已创建', 'success');
                setShowEditModal(false);
                setEditingGroup(null);
                fetchGroups();
            } else {
                showToast('保存失败', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('保存出错', 'error');
        }
    };

    const handleDeleteGroup = async (id: string) => {
        const confirmed = await confirm({
            title: '确认删除',
            message: '确定要删除此拼团吗？此操作无法撤销。',
            confirmText: '删除',
            cancelText: '取消'
        });
        if (!confirmed) return;

        try {
            const res = await fetch('/api/groups', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (res.ok) {
                showToast('拼团已删除', 'success');
                fetchGroups();
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('删除失败', 'error');
        }
    };

    const updateStatus = async (id: string, newStatus: string) => {
        const title = newStatus === '已锁单' ? '确认锁单' : newStatus === '已结束' ? '确认结束' : '确认操作';
        const msg = newStatus === '已结束'
            ? '结束拼团后将无法再修改。确定要结束吗？'
            : `确定要将拼团状态更改为 "${newStatus}" 吗？`;

        const confirmed = await confirm({
            title: title,
            message: msg,
            confirmText: '确认',
            cancelText: '取消'
        });
        if (!confirmed) return;

        try {
            const res = await fetch('/api/groups', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: newStatus })
            });
            if (res.ok) {
                showToast('状态已更新', 'success');
                fetchGroups();
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const toggleHot = async (id: string, currentIsHot: boolean, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const res = await fetch('/api/groups', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isHot: !currentIsHot })
            });
            if (res.ok) fetchGroups();
        } catch (error) {
            console.error('Error:', error);
        }
    };

    // --- Participant Actions ---
    const openParticipants = async (groupId: string) => {
        setCurrentGroupId(groupId);
        setShowParticipantsModal(true);
        setLoadingParticipants(true);
        try {
            const res = await fetch(`/api/groups/participants?groupId=${groupId}`);
            if (res.ok) {
                setParticipants(await res.json());
            } else {
                showToast('获取参与者失败', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoadingParticipants(false);
        }
    };

    const updateParticipantQuantity = async (userId: string, quantity: number) => {
        if (!currentGroupId) return;
        try {
            const res = await fetch('/api/groups/participants', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupId: currentGroupId, userId, quantity })
            });
            if (res.ok) {
                showToast('份数已更新', 'success');
                // Refresh list
                openParticipants(currentGroupId);
                // Also refresh groups to update counts
                fetchGroups();
            } else {
                const data = await res.json();
                showToast(data.error || '更新失败', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('更新出错', 'error');
        }
    };

    const removeParticipant = async (userId: string) => {
        if (!currentGroupId) return;
        const confirmed = await confirm({
            title: '确认移除',
            message: '确定要移除该参与者吗？这将会减少拼团的当前进度。',
            confirmText: '移除',
            cancelText: '取消'
        });
        if (!confirmed) return;

        try {
            const res = await fetch('/api/groups/participants', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupId: currentGroupId, userId })
            });
            if (res.ok) {
                showToast('参与者已移除', 'success');
                openParticipants(currentGroupId);
                fetchGroups();
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('移除失败', 'error');
        }
    };

    // --- Render Components ---

    const GroupEditModal = () => {
        if (!editingGroup) return null;

        const addFeature = () => {
            const features = [...(editingGroup.features || []), ''];
            setEditingGroup({ ...editingGroup, features });
        };

        const updateFeature = (idx: number, val: string) => {
            const features = [...(editingGroup.features || [])];
            features[idx] = val;
            setEditingGroup({ ...editingGroup, features });
        };

        const removeFeature = (idx: number) => {
            const features = (editingGroup.features || []).filter((_, i) => i !== idx);
            setEditingGroup({ ...editingGroup, features });
        };

        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowEditModal(false)}>
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-lg text-gray-900">{editingGroup.id ? '编辑拼团' : '发布新拼团'}</h3>
                        <button onClick={() => setShowEditModal(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                    </div>

                    <form onSubmit={handleSaveGroup} className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">拼团名称 <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={editingGroup.title || ''}
                                    onChange={e => setEditingGroup({ ...editingGroup, title: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">价格 (￥) <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editingGroup.price || ''}
                                        onChange={e => setEditingGroup({ ...editingGroup, price: parseFloat(e.target.value) })}
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">目标人数 <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        value={editingGroup.targetCount || ''}
                                        onChange={e => setEditingGroup({ ...editingGroup, targetCount: parseInt(e.target.value) })}
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">描述</label>
                                <textarea
                                    value={editingGroup.description || ''}
                                    onChange={e => setEditingGroup({ ...editingGroup, description: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                    rows={3}
                                />
                            </div>
                        </div>

                        {/* Features */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-bold text-gray-700">拼团特性 (Features)</label>
                                <button type="button" onClick={addFeature} className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100 flex items-center gap-1">
                                    <Plus size={12} /> 添加
                                </button>
                            </div>
                            <div className="space-y-2">
                                {(editingGroup.features || []).map((f, i) => (
                                    <div key={i} className="flex gap-2">
                                        <input
                                            value={f}
                                            onChange={e => updateFeature(i, e.target.value)}
                                            className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
                                            placeholder="例如：自动发货"
                                        />
                                        <button type="button" onClick={() => removeFeature(i)} className="text-gray-400 hover:text-red-500 p-2">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Toggles */}
                        <div className="flex gap-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${editingGroup.isHot ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}`}>
                                    {editingGroup.isHot && <Check size={12} className="text-white" />}
                                    <input type="checkbox" className="hidden" checked={editingGroup.isHot || false} onChange={e => setEditingGroup({ ...editingGroup, isHot: e.target.checked })} />
                                </div>
                                <span className="text-sm font-medium">设为热销</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${editingGroup.autoRenew ? 'bg-purple-600 border-purple-600' : 'bg-white border-gray-300'}`}>
                                    {editingGroup.autoRenew && <Check size={12} className="text-white" />}
                                    <input type="checkbox" className="hidden" checked={editingGroup.autoRenew || false} onChange={e => setEditingGroup({ ...editingGroup, autoRenew: e.target.checked })} />
                                </div>
                                <span className="text-sm font-medium">自动续期 (人满自动重开)</span>
                            </label>
                        </div>
                    </form>

                    <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                        <button onClick={() => setShowEditModal(false)} className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-100">取消</button>
                        <button onClick={handleSaveGroup} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm">保存</button>
                    </div>
                </div>
            </div>
        );
    };

    const ParticipantsModal = () => {
        if (!showParticipantsModal) return null;

        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowParticipantsModal(false)}>
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col overflow-hidden transition-all" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh' }}>
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div>
                            <h3 className="font-bold text-lg text-gray-900">参与者列表</h3>
                            <p className="text-xs text-gray-500 mt-0.5">管理拼团成员及份数</p>
                        </div>
                        <button onClick={() => setShowParticipantsModal(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 custom-scrollbar" style={{ minHeight: '300px' }}>
                        {loadingParticipants ? (
                            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div></div>
                        ) : participants.length === 0 ? (
                            <div className="text-center py-16 text-gray-400">
                                <Users size={48} className="mx-auto mb-3 opacity-20" />
                                <p>暂无参与者</p>
                            </div>
                        ) : (
                            participants.map(p => (
                                <ParticipantItem key={p.userId} p={p} />
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const ParticipantItem = ({ p }: { p: GroupParticipant }) => {
        const [isEditingQty, setIsEditingQty] = useState(false);
        const [qty, setQty] = useState(p.quantity);
        const [showContacts, setShowContacts] = useState(false);

        const handleQtySave = async () => {
            if (qty !== p.quantity) {
                await updateParticipantQuantity(p.userId, qty);
            }
            setIsEditingQty(false);
        };

        return (
            <div className="flex flex-col p-4 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition-all shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* User Info */}
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                            {p.name?.[0]?.toUpperCase() || p.users?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                            <div className="font-medium text-gray-900 text-sm">{p.name || p.users?.name || '未知用户'}</div>
                            <div className="text-xs text-gray-400 font-mono">{p.users?.email}</div>
                        </div>
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-col sm:items-end gap-1.5 w-full sm:w-auto">
                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full">
                            {/* Quantity Editor */}
                            <div className="flex items-center">
                                {isEditingQty ? (
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            value={qty}
                                            onChange={e => setQty(parseInt(e.target.value) || 1)}
                                            className="w-12 border rounded px-1 py-0.5 text-xs outline-indigo-500"
                                            min={1}
                                        />
                                        <button onClick={handleQtySave} className="p-0.5 bg-indigo-600 text-white rounded hover:bg-indigo-700"><Check size={12} /></button>
                                        <button onClick={() => { setQty(p.quantity); setIsEditingQty(false); }} className="p-0.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"><X size={12} /></button>
                                    </div>
                                ) : (
                                    <button onClick={() => setIsEditingQty(true)} className="flex items-center gap-1 hover:bg-indigo-50 px-2 py-0.5 rounded-full group border border-transparent hover:border-indigo-100 transition-all">
                                        <span className="text-xs text-gray-500">份数:</span>
                                        <span className="font-bold text-gray-900">{p.quantity}</span>
                                        <Edit size={10} className="text-indigo-400 opacity-0 group-hover:opacity-100" />
                                    </button>
                                )}
                            </div>

                            {/* Join Time */}
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-50 rounded text-xs text-gray-500 whitespace-nowrap min-w-[140px] justify-end">
                                <Clock size={10} className="text-gray-400" />
                                {formatBeijing(p.joinedAt)}
                            </div>

                            {/* Remove Action */}
                            <button
                                onClick={() => removeParticipant(p.userId)}
                                className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
                                title="移除参与者"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>

                        {/* Contact Info */}
                        <div className="flex justify-start sm:justify-end w-full">
                            {p.contact ? (
                                <button
                                    onClick={() => setShowContacts(!showContacts)}
                                    className={`flex items-center gap-1.5 px-2 py-1 rounded border transition-colors text-xs ${showContacts ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                >
                                    <span className="font-mono select-all truncate max-w-[150px]">{p.contact}</span>
                                    <ChevronRight size={12} className={`transition-transform duration-200 ${showContacts ? 'rotate-90' : ''}`} />
                                </button>
                            ) : (
                                <span className="text-gray-300 italic px-2 text-xs">未留联系方式</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Dropdown Contacts */}
                {showContacts && (
                    <div className="mt-3 bg-white rounded-lg border border-indigo-100 shadow-sm p-2 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200 mx-1">
                        <div className="text-[10px] font-bold text-gray-400 px-2 py-0.5 uppercase tracking-wider mb-1">所有联系方式</div>
                        {p.savedContacts?.map((c, i) => (
                            <div key={i} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded text-xs text-gray-700 transition-colors">
                                {c.type === 'qq' ? <div className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium min-w-[30px] text-center">QQ</div> :
                                    c.type === 'wechat' ? <div className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded font-medium min-w-[30px] text-center">WX</div> :
                                        <div className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium min-w-[30px] text-center">{c.type}</div>}
                                <span className="select-all font-mono text-gray-600">{c.value}</span>
                            </div>
                        ))}
                        {(!p.savedContacts || p.savedContacts.length === 0) && (
                            <div className="px-2 py-2 text-xs text-gray-400 text-center italic">无额外联系方式</div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div></div>;
    }

    const activeGroups = groups.filter(g => g.status === '进行中');
    const lockedGroups = groups.filter(g => g.status === '已锁单');
    const endedGroups = groups.filter(g => g.status === '已结束');

    const GroupColumn = ({ title, status, items, icon: Icon, colorClass, bgClass, countColor }: any) => (
        <div className="flex flex-col h-full min-w-[320px] bg-gray-50/50 rounded-2xl border border-gray-200 overflow-hidden">
            {/* Column Header */}
            <div className={`p-4 border-b border-gray-100 flex justify-between items-center ${bgClass}`}>
                <div className="flex items-center gap-2">
                    <Icon size={18} className={colorClass} />
                    <h3 className="font-bold text-gray-800">{title}</h3>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white bg-opacity-60 ${countColor}`}>
                    {items.length}
                </span>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {items.length === 0 && (
                    <div className="text-center py-10 text-gray-400 text-sm">暂无{title}拼团</div>
                )}
                {items.map((g: GroupBuy) => (
                    <div key={g.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group relative">
                        {/* Card Header: Title & Hot/Renew Badges */}
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 min-w-0 pr-2">
                                <h4 className="font-bold text-gray-900 text-sm line-clamp-1" title={g.title}>{g.title}</h4>
                                <div className="flex items-center gap-1 mt-1">
                                    {g.autoRenew && <span className="flex items-center gap-0.5 text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100"><Repeat size={10} /> 自动续期</span>}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold text-gray-900">￥{g.price}</div>
                            </div>
                        </div>

                        {/* Progress */}
                        <div className="mb-4 space-y-1">
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>进度</span>
                                <span className={g.currentCount >= g.targetCount ? 'text-green-600 font-bold' : 'text-indigo-600'}>
                                    {g.currentCount}/{g.targetCount}
                                </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${g.currentCount >= g.targetCount ? 'bg-green-500' : 'bg-indigo-500'}`}
                                    style={{ width: `${Math.min(100, (g.currentCount / g.targetCount) * 100)}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Actions Row */}
                        <div className="space-y-3 pt-3 border-t border-gray-50">

                            {/* Primary Toggles/Actions */}
                            <div className="flex items-center justify-between gap-2">
                                <button
                                    onClick={() => toggleHot(g.id, !!g.isHot, null as any)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${g.isHot ? 'bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-orange-500'}`}
                                >
                                    <Flame size={12} className={g.isHot ? 'fill-orange-500' : 'fill-gray-400'} />
                                    {g.isHot ? '热销中' : '设为热销'}
                                </button>

                                <button
                                    onClick={() => openParticipants(g.id)}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium border border-indigo-100 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                >
                                    <Users size={12} />
                                    成员
                                </button>
                            </div>

                            {/* Status Management Buttons */}
                            {g.status === '进行中' && (
                                <button
                                    onClick={() => updateStatus(g.id, '已锁单')}
                                    className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium border border-green-100 bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                                >
                                    <Lock size={12} /> 手动锁单
                                </button>
                            )}

                            {g.status === '已锁单' && (
                                <div className="flex justify-between gap-2">
                                    <button
                                        onClick={() => updateStatus(g.id, '进行中')}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium border border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                                    >
                                        <Unlock size={12} /> 解锁
                                    </button>
                                    <button
                                        onClick={() => updateStatus(g.id, '已结束')}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
                                    >
                                        <AlertCircle size={12} /> 结束
                                    </button>
                                </div>
                            )}

                            {g.status === '已结束' && (
                                <div className="w-full text-center text-xs text-gray-400 py-1.5 bg-gray-50 rounded border border-gray-100">
                                    已归档
                                </div>
                            )}

                            {/* Edit/Delete Tools */}
                            <div className="flex justify-between items-center pt-1 border-t border-gray-50/50">
                                <span className="text-[10px] text-gray-300 font-mono">ID: {g.id.slice(0, 6)}</span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => { setEditingGroup(g); setShowEditModal(true); }}
                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                        title="编辑"
                                    >
                                        <Edit size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteGroup(g.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                        title="删除"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    if (loading) {
        return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div></div>;
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex-none p-4 pb-2 flex justify-between items-center bg-white border-b border-gray-100 z-10 shadow-sm mb-4 rounded-xl mx-4 mt-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">拼团管理</h2>
                    <p className="text-sm text-gray-500">看板视图管理所有状态的拼团</p>
                </div>
                <button
                    onClick={() => { setEditingGroup({ status: GroupStatus.ACTIVE, features: [] }); setShowEditModal(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 shadow-md shadow-indigo-200"
                >
                    <Plus size={16} /> 发布拼团
                </button>
            </div>

            {/* Kanban Columns Container - Independent Scrolling */}
            <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
                <div className="h-full grid grid-cols-1 md:grid-cols-3 gap-6 px-4 pb-4 min-w-[1000px] md:min-w-0">
                    <GroupColumn
                        title="进行中"
                        status="进行中"
                        items={activeGroups}
                        icon={Users}
                        colorClass="text-blue-600"
                        bgClass="bg-blue-50/50"
                        countColor="text-blue-600"
                    />
                    <GroupColumn
                        title="已锁单"
                        status="已锁单"
                        items={lockedGroups}
                        icon={Lock}
                        colorClass="text-green-600"
                        bgClass="bg-green-50/50"
                        countColor="text-green-600"
                    />
                    <GroupColumn
                        title="已结束"
                        status="已结束"
                        items={endedGroups}
                        icon={Check}
                        colorClass="text-gray-500"
                        bgClass="bg-gray-100/50"
                        countColor="text-gray-600"
                    />
                </div>
            </div>

            {/* Modals */}
            {showEditModal && <GroupEditModal />}
            {showParticipantsModal && <ParticipantsModal />}
        </div>
    );
}
