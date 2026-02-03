'use client';

import React, { useState, useEffect } from 'react';
import {
    Plus, Edit, Trash2, Gift, Play, Eye, Flame, Users, Clock,
    Search, Filter, ChevronRight, ChevronDown, Trophy, Phone, Mail, X, Save,
    MoreHorizontal, Calendar, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useToast } from '@/lib/GlobalToast';
import { useConfirm } from '@/lib/ConfirmContext';
import { utcToBeijingInputString, formatBeijing } from '@/lib/timezone';
import type { Lottery, Participant } from '../_shared/types';

// --- Components ---

const StatusBadge = ({ status }: { status: string }) => {
    const styles = status === '待开奖'
        ? 'bg-amber-50 text-amber-700 border-amber-100'
        : 'bg-green-50 text-green-700 border-green-100';

    return (
        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${styles}`}>
            {status}
        </span>
    );
};

const LotteryCard = ({
    lottery,
    onEdit,
    onDelete,
    onDraw,
    onViewParticipants,
    onToggleHot
}: {
    lottery: Lottery;
    onEdit: (l: Lottery) => void;
    onDelete: (id: string) => void;
    onDraw: (id: string) => void;
    onViewParticipants: (id: string) => void;
    onToggleHot: (id: string, current: boolean) => void;
}) => {
    const isPending = lottery.status === '待开奖';

    return (
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0 mr-3">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-gray-900 text-sm md:text-base line-clamp-1" title={lottery.title}>
                            {lottery.title}
                        </h4>
                        {lottery.isHot && <Flame size={14} className="text-orange-500 fill-orange-500 flex-shrink-0" />}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                            <Gift size={12} className="text-indigo-500" />
                            {lottery.winnersCount} 名额
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="font-mono text-amber-600 font-bold">{lottery.entryCost}</span> 积分
                        </span>
                    </div>
                </div>
                <StatusBadge status={lottery.status} />
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-2 mb-4 bg-gray-50/50 p-3 rounded-lg border border-gray-100/50">
                <div className="space-y-1">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">参与人数</p>
                    <div className="flex items-baseline gap-1">
                        <span className={`text-sm font-bold ${lottery.participants >= (lottery.minParticipants || 0) ? 'text-green-600' : 'text-gray-700'}`}>
                            {lottery.participants}
                        </span>
                        <span className="text-xs text-gray-400">/ {lottery.minParticipants || 1}</span>
                    </div>
                </div>
                <div className="space-y-1 text-right">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">开奖时间</p>
                    <p className="text-xs font-medium text-gray-700 font-mono">
                        {formatBeijing(lottery.drawDate)}
                    </p>
                </div>
            </div>

            {/* Prizes Preview */}
            {lottery.prizes && lottery.prizes.length > 0 && (
                <div className="mb-4 text-xs text-gray-600 bg-indigo-50/30 px-3 py-2 rounded border border-indigo-50">
                    <p className="font-medium text-indigo-700 mb-1 flex items-center gap-1">
                        <Trophy size={10} /> 奖品列表
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-gray-600 pl-1">
                        {lottery.prizes.slice(0, 2).map((p, i) => (
                            <li key={i} className="line-clamp-1">{p}</li>
                        ))}
                        {lottery.prizes.length > 2 && <li className="list-none text-gray-400 pl-4">...等 {lottery.prizes.length} 项</li>}
                    </ul>
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                <div className="flex gap-2">
                    <button
                        onClick={() => onViewParticipants(lottery.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                    >
                        <Users size={12} /> 成员
                    </button>
                    <button
                        onClick={() => onToggleHot(lottery.id, !!lottery.isHot)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${lottery.isHot ? 'bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-orange-500'}`}
                        title={lottery.isHot ? "取消热销" : "设为热销"}
                    >
                        <Flame size={12} className={lottery.isHot ? "fill-orange-500" : "fill-gray-400"} />
                        {lottery.isHot ? '热销中' : '设为热销'}
                    </button>
                </div>

                <div className="flex items-center gap-1">
                    {isPending && (
                        <button
                            onClick={() => onDraw(lottery.id)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="立即开奖"
                        >
                            <Play size={16} />
                        </button>
                    )}
                    <button
                        onClick={() => onEdit(lottery)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="编辑"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        onClick={() => onDelete(lottery.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

const ParticipantItem = ({ p }: { p: Participant }) => {
    const [showContacts, setShowContacts] = useState(false);

    return (
        <div className={`flex flex-col p-4 rounded-xl border transition-all ${p.isWinner ? 'bg-amber-50 border-amber-200 shadow-sm relative overflow-hidden' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
            {p.isWinner && (
                <div className="absolute top-0 right-0 bg-amber-400 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-bold">
                    中奖者
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                {/* User Info */}
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${p.isWinner ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.users?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className={`font-bold text-sm ${p.isWinner ? 'text-gray-900' : 'text-gray-700'}`}>
                                {p.users?.name || '未知用户'}
                            </p>
                            {p.isWinner && <Trophy size={14} className="text-amber-500 fill-amber-500" />}
                        </div>
                        <p className="text-xs text-gray-400">{p.users?.email}</p>
                    </div>
                </div>

                {/* Meta Info */}
                <div className="flex flex-col sm:items-end gap-1 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded">
                        <Clock size={12} className="text-gray-400" />
                        {new Date(p.createdAt).toLocaleString('zh-CN')}
                    </div>

                    <div className="flex flex-col items-end gap-1">
                        {p.contactInfo ? (
                            <button
                                onClick={() => setShowContacts(!showContacts)}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded border transition-colors ${showContacts ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                            >
                                <Phone size={12} />
                                <span className="font-mono select-all">{p.contactInfo}</span>
                                <ChevronRight size={12} className={`transition-transform duration-200 ${showContacts ? 'rotate-90' : ''}`} />
                            </button>
                        ) : (
                            <span className="text-gray-300 italic px-2">未留联系方式</span>
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

// --- Main Page ---

export default function AdminLotteriesPage() {
    const [lotteries, setLotteries] = useState<Lottery[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Partial<Lottery> | null>(null);
    const [showParticipants, setShowParticipants] = useState(false);
    const [currentParticipants, setCurrentParticipants] = useState<Participant[]>([]);
    const [prizeInput, setPrizeInput] = useState('');

    // Filters
    // Note: We're splitting into columns, so basic filtering is implicit in the layout.
    // Ideally could add a search bar later.

    const { showToast } = useToast();
    const { confirm } = useConfirm();

    useEffect(() => {
        fetchLotteries();
    }, []);

    const fetchLotteries = async () => {
        try {
            const res = await fetch('/api/lottery');
            if (res.ok) setLotteries(await res.json());
        } catch (error) {
            console.error('Error:', error);
            showToast('获取数据失败', 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- Actions ---

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editing) return;

        // Validation
        if (!editing.prizes || editing.prizes.length === 0) {
            showToast('请至少添加一个奖品', 'error');
            return;
        }

        try {
            const res = await fetch('/api/lottery', {
                method: editing.id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editing)
            });
            if (res.ok) {
                showToast(editing.id ? '更新成功' : '创建成功', 'success');
                setShowModal(false);
                setEditing(null);
                fetchLotteries();
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('保存失败', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!await confirm({ title: '确认删除', message: '删除后无法恢复，确定要继续吗？' })) return;

        try {
            const res = await fetch('/api/lottery', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (res.ok) {
                showToast('已删除', 'success');
                fetchLotteries();
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('删除失败', 'error');
        }
    };

    const handleDraw = async (id: string) => {
        if (!await confirm({
            title: '确认开奖',
            message: '即将进行随机抽奖。请确保参与人数满足要求。确定继续吗？',
            confirmText: '立即开奖'
        })) return;

        try {
            const res = await fetch('/api/lottery/draw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lotteryId: id })
            });
            if (res.ok) {
                showToast('开奖成功！', 'success');
                fetchLotteries();
            } else {
                const data = await res.json();
                showToast(data.error || '开奖失败', 'error');
            }
        } catch (error) {
            showToast('请求失败', 'error');
        }
    };

    const handleToggleHot = async (id: string, currentIsHot: boolean) => {
        try {
            const res = await fetch('/api/lottery', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isHot: !currentIsHot })
            });
            if (res.ok) fetchLotteries();
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleViewParticipants = async (id: string) => {
        try {
            const res = await fetch(`/api/lottery/${id}/entries`);
            if (res.ok) {
                const data = await res.json();
                // Sort: Winners first, then by join time
                data.sort((a: Participant, b: Participant) => {
                    if (a.isWinner && !b.isWinner) return -1;
                    if (!a.isWinner && b.isWinner) return 1;
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                });
                setCurrentParticipants(data);
                setShowParticipants(true);
            }
        } catch (error) {
            showToast('获取参与者失败', 'error');
        }
    };

    // Prize Management Helpers
    const addPrize = () => {
        if (!prizeInput.trim()) return;
        setEditing(prev => ({
            ...prev,
            prizes: [...(prev?.prizes || []), prizeInput.trim()]
        }));
        setPrizeInput('');
    };

    const removePrize = (index: number) => {
        setEditing(prev => ({
            ...prev,
            prizes: (prev?.prizes || []).filter((_, i) => i !== index)
        }));
    };

    // Columns
    const pendingLotteries = lotteries.filter(l => l.status === '待开奖');
    const completedLotteries = lotteries.filter(l => l.status === '已开奖' || l.status === '已结束');

    if (loading) return <div className="flex h-64 items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div></div>;

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">抽奖管理</h2>
                    <p className="text-sm text-gray-500">管理所有抽奖活动、开奖及参与者</p>
                </div>
                <button
                    onClick={() => { setEditing({ prizes: [], isHot: false }); setShowModal(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all"
                >
                    <Plus size={16} /> 发布抽奖
                </button>
            </div>

            {/* Kanban Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-220px)]">

                {/* Column: Pending */}
                <div className="flex flex-col bg-gray-50/50 rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-amber-50/30">
                        <div className="flex items-center gap-2">
                            <Clock size={18} className="text-amber-600" />
                            <h3 className="font-bold text-gray-800">待开奖（进行中）</h3>
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white text-amber-600 border border-amber-100">
                            {pendingLotteries.length}
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {pendingLotteries.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">暂无进行中的活动</div>}
                        {pendingLotteries.map(l => (
                            <LotteryCard
                                key={l.id}
                                lottery={l}
                                onEdit={(l) => { setEditing(l); setShowModal(true); }}
                                onDelete={handleDelete}
                                onDraw={handleDraw}
                                onViewParticipants={handleViewParticipants}
                                onToggleHot={handleToggleHot}
                            />
                        ))}
                    </div>
                </div>

                {/* Column: Completed */}
                <div className="flex flex-col bg-gray-50/50 rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-green-50/30">
                        <div className="flex items-center gap-2">
                            <Trophy size={18} className="text-green-600" />
                            <h3 className="font-bold text-gray-800">已开奖 / 结束</h3>
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white text-green-600 border border-green-100">
                            {completedLotteries.length}
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {completedLotteries.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">暂无历史活动</div>}
                        {completedLotteries.map(l => (
                            <LotteryCard
                                key={l.id}
                                lottery={l}
                                onEdit={(l) => { setEditing(l); setShowModal(true); }}
                                onDelete={handleDelete}
                                onDraw={handleDraw}
                                onViewParticipants={handleViewParticipants}
                                onToggleHot={handleToggleHot}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-lg text-gray-800">{editing?.id ? '编辑抽奖活动' : '发布新抽奖'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <form id="lotteryForm" onSubmit={handleSave} className="space-y-6">
                                {/* Basic Info */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">活动标题</label>
                                        <input
                                            type="text"
                                            value={editing?.title || ''}
                                            onChange={e => setEditing({ ...editing, title: e.target.value })}
                                            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                            placeholder="输入吸引人的活动标题..."
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">活动描述</label>
                                        <textarea
                                            value={editing?.description || ''}
                                            onChange={e => setEditing({ ...editing, description: e.target.value })}
                                            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                            rows={3}
                                            placeholder="描述活动规则和详情..."
                                        />
                                    </div>
                                </div>

                                {/* Rules Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-gray-50 rounded-xl border border-gray-100">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">消耗积分 / 次</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="0"
                                                value={editing?.entryCost || ''}
                                                onChange={e => setEditing({ ...editing, entryCost: parseInt(e.target.value) })}
                                                className="w-full border border-gray-200 rounded-lg pl-4 pr-8 py-2 text-sm"
                                                required
                                            />
                                            <span className="absolute right-3 top-2 text-xs text-gray-400">PTS</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">中奖名额</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={editing?.winnersCount || ''}
                                            onChange={e => setEditing({ ...editing, winnersCount: parseInt(e.target.value) })}
                                            className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">最少参与人数</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={editing?.minParticipants || ''}
                                            onChange={e => setEditing({ ...editing, minParticipants: parseInt(e.target.value) })}
                                            className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm"
                                            placeholder="默认 1"
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">未达人数自动延期</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">开奖时间 (北京时间)</label>
                                        <input
                                            type="datetime-local"
                                            value={editing?.drawDate ? utcToBeijingInputString(editing.drawDate) : ''}
                                            onChange={e => setEditing({ ...editing, drawDate: e.target.value })}
                                            className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm font-mono"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Prize List Editor */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">奖品列表</label>
                                    <div className="flex gap-2 mb-3">
                                        <input
                                            type="text"
                                            value={prizeInput}
                                            onChange={e => setPrizeInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addPrize())}
                                            className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm"
                                            placeholder="输入奖品名称（按回车添加）..."
                                        />
                                        <button
                                            type="button"
                                            onClick={addPrize}
                                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                                        >
                                            添加
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        {(editing?.prizes || []).map((prize, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-indigo-50 px-4 py-2.5 rounded-lg border border-indigo-100 group">
                                                <span className="text-sm text-indigo-900 flex items-center gap-2">
                                                    <Gift size={14} className="text-indigo-400" />
                                                    {prize}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => removePrize(idx)}
                                                    className="text-indigo-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                        {(!editing?.prizes || editing.prizes.length === 0) && (
                                            <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-sm text-gray-400">
                                                暂无奖品，请添加至少一个奖品
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="isHot"
                                        checked={editing?.isHot || false}
                                        onChange={e => setEditing({ ...editing, isHot: e.target.checked })}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <label htmlFor="isHot" className="text-sm text-gray-700 select-none cursor-pointer">设为热销（首页推荐）</label>
                                </div>
                            </form>
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-lg text-gray-600 font-medium hover:bg-gray-100 transition-colors text-sm">取消</button>
                            <button form="lotteryForm" type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all text-sm flex items-center gap-2">
                                <Save size={16} /> 保存
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Participants Modal with Contact Info */}
            {showParticipants && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowParticipants(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden transition-all" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh' }}>
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="font-bold text-lg text-gray-800">参与者名单</h3>
                                <p className="text-xs text-gray-500 mt-0.5">共 {currentParticipants.length} 人参与</p>
                            </div>
                            <button onClick={() => setShowParticipants(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 custom-scrollbar" style={{ minHeight: '300px' }}>
                            {currentParticipants.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                    <Users size={32} className="mb-3 opacity-20" />
                                    <p>暂无参与记录</p>
                                </div>
                            ) : (
                                currentParticipants.map((p) => (
                                    <ParticipantItem key={p.id} p={p} />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
