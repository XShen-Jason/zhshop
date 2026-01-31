'use client';

import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
    id: string;
    message: string;
    type: ToastType;
    onDismiss: (id: string) => void;
}

export function Toast({ id, message, type, onDismiss }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(id);
        }, 3000);
        return () => clearTimeout(timer);
    }, [id, onDismiss]);

    const icons = {
        success: <CheckCircle size={20} className="text-green-500" />,
        error: <AlertCircle size={20} className="text-red-500" />,
        info: <Info size={20} className="text-blue-500" />
    };

    const bgColors = {
        success: 'bg-white border-green-100',
        error: 'bg-white border-red-100',
        info: 'bg-white border-blue-100'
    };

    return (
        <div className={`flex items-center p-4 rounded-xl shadow-lg border ${bgColors[type]} transform transition-all animate-slide-in-right min-w-[300px]`}>
            <div className="mr-3">{icons[type]}</div>
            <p className="flex-1 text-sm font-medium text-gray-800">{message}</p>
            <button
                onClick={() => onDismiss(id)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
            >
                <X size={16} />
            </button>
        </div>
    );
}
