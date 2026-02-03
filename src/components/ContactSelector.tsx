'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MessageCircle, Phone, Mail, Send, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import Link from 'next/link';

interface ContactSelectorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    showLabel?: boolean;
}

interface SavedContact {
    type: string;
    value: string;
    label?: string;
}

const TYPE_ICONS: any = {
    QQ: MessageCircle,
    WeChat: MessageCircle,
    Phone: Phone,
    Email: Mail,
    Telegram: Send,
    Other: MessageCircle
};

export function ContactSelector({
    value,
    onChange,
    placeholder = "请选择联系方式",
    showLabel = false
}: ContactSelectorProps) {
    const [savedContacts, setSavedContacts] = useState<SavedContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [userEmail, setUserEmail] = useState<string>('');

    // Priority Order
    const typeOrder = ['WeChat', 'Phone', 'QQ', 'Telegram', 'Email'];
    const getPriority = (type: string) => {
        const index = typeOrder.indexOf(type);
        return index === -1 ? 99 : index;
    };

    useEffect(() => {
        async function fetchContacts() {
            setLoading(true);
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setUserEmail(user.email || '');

                    const { data } = await supabase
                        .from('users')
                        .select('saved_contacts')
                        .eq('id', user.id)
                        .single();

                    let contacts = data?.saved_contacts || [];

                    // Sort contacts by priority
                    contacts.sort((a: SavedContact, b: SavedContact) => getPriority(a.type) - getPriority(b.type));

                    setSavedContacts(contacts);

                    // Auto-select if value is empty
                    if (!value) {
                        if (contacts.length > 0) {
                            // Select first available (highest priority)
                            onChange(`${contacts[0].value}`);
                        } else if (user.email) {
                            // Fallback to email
                            onChange(`${user.email}`);
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to fetch contacts', error);
            } finally {
                setLoading(false);
            }
        }
        fetchContacts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSelect = (contactValue: string) => {
        onChange(contactValue);
        setExpanded(false);
    };

    const dropdownOptions = [...savedContacts];

    // Determine the icon to show for current value
    const getCurrentIcon = () => {
        if (!value) return null;
        // Try to find matching contact type
        const match = savedContacts.find(c => c.value === value) || (value === userEmail ? { type: 'Email' } : null);
        if (match) {
            const Icon = TYPE_ICONS[match.type];
            return Icon ? <Icon size={18} className="text-gray-500 mr-2" /> : null;
        }
        return <MessageCircle size={18} className="text-gray-500 mr-2" />;
    };

    return (
        <div className="space-y-2 relative">
            {showLabel && <label className="block text-sm font-bold text-gray-700">联系方式</label>}

            <div
                onClick={() => setExpanded(!expanded)}
                className={`w-full px-4 py-3 border rounded-xl flex justify-between items-center cursor-pointer transition-all ${expanded ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-gray-200 hover:border-gray-300'
                    } bg-white`}
            >
                <div className="flex items-center truncate mr-2">
                    {getCurrentIcon()}
                    <span className={`truncate ${value ? "text-gray-900 font-medium" : "text-gray-400"}`}>
                        {value || placeholder}
                    </span>
                </div>
                <div className="flex-shrink-0 text-gray-400">
                    {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
            </div>

            {/* Dropdown */}
            {expanded && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500">选择联系方式</span>
                        <Link href="/user?tab=contacts" className="text-xs text-indigo-600 font-bold hover:underline flex items-center">
                            <Settings size={12} className="mr-1" /> 管理
                        </Link>
                    </div>

                    <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                        {dropdownOptions.length === 0 && !userEmail && (
                            <div className="p-4 text-center text-gray-500 text-sm">
                                暂无保存的联系方式
                            </div>
                        )}

                        {dropdownOptions.map((c, i) => {
                            const Icon = TYPE_ICONS[c.type] || MessageCircle;
                            const isSelected = value === c.value;
                            return (
                                <button
                                    key={`saved-${i}`}
                                    type="button"
                                    onClick={() => handleSelect(c.value)}
                                    className={`w-full flex items-center text-left p-3 rounded-lg transition group ${isSelected
                                        ? 'bg-indigo-50 text-indigo-700'
                                        : 'hover:bg-gray-50 text-gray-700'
                                        }`}
                                >
                                    <Icon size={16} className={`mr-3 ${isSelected ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500'}`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center">
                                            <span className="font-bold text-sm mr-2">{c.label || c.type}</span>
                                        </div>
                                        <div className={`text-xs truncate ${isSelected ? 'text-indigo-500' : 'text-gray-500'}`}>
                                            {c.value}
                                        </div>
                                    </div>
                                    {isSelected && <div className="w-2 h-2 rounded-full bg-indigo-600 ml-2"></div>}
                                </button>
                            );
                        })}

                        {/* Registered Email Option - Only show if not already in saved list */}
                        {userEmail && !dropdownOptions.some(c => c.value === userEmail) && (
                            <button
                                type="button"
                                onClick={() => handleSelect(userEmail)}
                                className={`w-full flex items-center text-left p-3 rounded-lg transition group ${value === userEmail
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : 'hover:bg-gray-50 text-gray-700'
                                    }`}
                            >
                                <Mail size={16} className={`mr-3 ${value === userEmail ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500'}`} />
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm">注册邮箱</div>
                                    <div className={`text-xs truncate ${value === userEmail ? 'text-indigo-500' : 'text-gray-500'}`}>
                                        {userEmail}
                                    </div>
                                </div>
                                {value === userEmail && <div className="w-2 h-2 rounded-full bg-indigo-600 ml-2"></div>}
                            </button>
                        )}
                    </div>

                    {/* Add New Link at the bottom if empty or just always nice to have? 
                        User explicitly said "Want to modify? Go to personal center".
                        The top "Manage" link covers it.
                    */}
                </div>
            )}

            {/* Overlay to close dropdown when clicking outside */}
            {expanded && (
                <div className="fixed inset-0 z-40" onClick={() => setExpanded(false)}></div>
            )}
        </div>
    );
}
