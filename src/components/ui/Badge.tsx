import React from 'react';

interface BadgeProps {
    status: string;
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
    let color = 'bg-gray-100 text-gray-600 border-gray-200';
    if (status === '进行中' || status === '有货' || status === '已完成' || status === 'Available') {
        color = 'bg-emerald-50 text-emerald-700 border-emerald-100';
    }
    if (status === '待联系' || status === '已锁单' || status === '待开奖') {
        color = 'bg-amber-50 text-amber-700 border-amber-100';
    }
    if (status === '已取消' || status === '无货' || status === 'Out of Stock') {
        color = 'bg-red-50 text-red-700 border-red-100';
    }

    return <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${color} ${className}`}>{status}</span>;
};
