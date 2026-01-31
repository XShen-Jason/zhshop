'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Toast, ToastProps, ToastType } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { v4 as uuidv4 } from 'uuid';

interface UIContextType {
    showToast: (message: string, type?: ToastType) => void;
    showConfirm: (title: string, message: string) => Promise<boolean>;
    showPrompt: (title: string, message: string, defaultValue?: string, placeholder?: string) => Promise<string | null>;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Omit<ToastProps, 'onDismiss'>[]>([]);
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        inputType?: 'text' | 'number';
        defaultValue?: string;
        placeholder?: string;
        resolve: ((value: any) => void) | null;
    }>({
        isOpen: false,
        title: '',
        message: '',
        resolve: null
    });

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = uuidv4();
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showConfirm = useCallback((title: string, message: string): Promise<boolean> => {
        return new Promise((resolve) => {
            setConfirmState({
                isOpen: true,
                title,
                message,
                resolve
            });
        });
    }, []);

    const showPrompt = useCallback((title: string, message: string, defaultValue = '', placeholder = ''): Promise<string | null> => {
        return new Promise((resolve) => {
            setConfirmState({
                isOpen: true,
                title,
                message,
                inputType: 'text',
                defaultValue,
                placeholder,
                resolve
            });
        });
    }, []);

    const handleConfirm = useCallback((value?: string) => {
        if (confirmState.resolve) {
            // If inputType is set, resolve with value, else boolean true
            confirmState.resolve(confirmState.inputType ? value : true);
        }
        setConfirmState(prev => ({ ...prev, isOpen: false, inputType: undefined }));
    }, [confirmState]);

    const handleCancel = useCallback(() => {
        if (confirmState.resolve) {
            // If inputType is set, resolve with null, else boolean false
            confirmState.resolve(confirmState.inputType ? null : false);
        }
        setConfirmState(prev => ({ ...prev, isOpen: false, inputType: undefined }));
    }, [confirmState]);

    return (
        <UIContext.Provider value={{ showToast, showConfirm, showPrompt }}>
            {children}
            {/* Toast Container */}
            <div className="fixed top-24 right-6 z-[10000] flex flex-col gap-3 pointer-events-none">
                {toasts.map(toast => (
                    <div key={toast.id} className="pointer-events-auto">
                        <Toast
                            id={toast.id}
                            message={toast.message}
                            type={toast.type}
                            onDismiss={dismissToast}
                        />
                    </div>
                ))}
            </div>
            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                message={confirmState.message}
                inputType={confirmState.inputType}
                defaultValue={confirmState.defaultValue}
                placeholder={confirmState.placeholder}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        </UIContext.Provider>
    );
}

export function useUI() {
    const context = useContext(UIContext);
    if (context === undefined) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
}
