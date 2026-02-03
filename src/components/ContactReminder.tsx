'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Phone, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

/**
 * ContactReminder - Shows a reminder modal when user is logged in but missing wechat or phone contact
 * Displays on every page load until user sets up contact info
 */
export const ContactReminder: React.FC = () => {
    const [showReminder, setShowReminder] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const checkContactInfo = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return;

            // Check if user has wechat or phone
            try {
                const res = await fetch('/api/contacts');
                if (res.ok) {
                    const contacts = await res.json();

                    // Check if any contact is wechat or phone type
                    const hasWechat = contacts.some((c: { type: string }) => c.type === 'wechat');
                    const hasPhone = contacts.some((c: { type: string }) => c.type === 'phone');

                    if (!hasWechat && !hasPhone) {
                        // Check session storage to avoid showing on every navigation
                        const lastDismissed = sessionStorage.getItem('contactReminderDismissed');
                        if (!lastDismissed) {
                            setShowReminder(true);
                        }
                    }
                }
            } catch (error) {
                console.error('Error checking contact info:', error);
            }
        };

        checkContactInfo();
    }, []);

    const handleDismiss = () => {
        setDismissed(true);
        setShowReminder(false);
        // Store in session storage so it doesn't show again during this session
        sessionStorage.setItem('contactReminderDismissed', 'true');
    };

    if (!showReminder || dismissed) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={handleDismiss}>
            <div
                className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-full">
                            <AlertTriangle className="text-amber-600" size={24} />
                        </div>
                        <h3 className="font-bold text-lg text-gray-900">完善联系方式</h3>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                    >
                        <X size={20} />
                    </button>
                </div>

                <p className="text-gray-600 mb-4">
                    为了便于在您下单后与您联系，请设置至少一种联系方式：
                </p>

                <div className="flex gap-3 mb-6 text-sm">
                    <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg flex-1">
                        <MessageCircle size={18} />
                        <span>微信</span>
                    </div>
                    <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg flex-1">
                        <Phone size={18} />
                        <span>手机号</span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleDismiss}
                        className="flex-1 py-2.5 px-4 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium"
                    >
                        稍后设置
                    </button>
                    <Link
                        href="/user"
                        className="flex-1 py-2.5 px-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium text-center"
                        onClick={handleDismiss}
                    >
                        立即设置
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ContactReminder;
