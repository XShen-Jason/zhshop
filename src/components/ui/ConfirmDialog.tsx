'use client';

import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

export interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: (value?: string) => void;
    onCancel: () => void;
    inputType?: 'text' | 'number';
    defaultValue?: string;
    placeholder?: string;
}

export function ConfirmDialog({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    inputType,
    defaultValue = '',
    placeholder = ''
}: ConfirmDialogProps) {
    const [value, setValue] = React.useState(defaultValue);

    React.useEffect(() => {
        if (isOpen) setValue(defaultValue);
    }, [isOpen, defaultValue]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-scale-in">
                <div className="p-6">
                    <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle className="text-amber-600" size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-center text-gray-900 mb-2">{title}</h3>
                    <p className="text-center text-gray-500 text-sm leading-relaxed mb-6">
                        {message}
                    </p>

                    {inputType && (
                        <div className="mb-6">
                            <input
                                type={inputType}
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                placeholder={placeholder}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') onConfirm(value);
                                    if (e.key === 'Escape') onCancel();
                                }}
                            />
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition"
                        >
                            取消
                        </button>
                        <button
                            onClick={() => onConfirm(value)}
                            className="flex-1 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
                        >
                            确认
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
