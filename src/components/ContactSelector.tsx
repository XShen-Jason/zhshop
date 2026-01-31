'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MessageCircle, Phone, Mail, Send, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';

interface ContactSelectorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
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

export function ContactSelector({ value, onChange, placeholder = "请输入联系方式" }: ContactSelectorProps) {
    const [savedContacts, setSavedContacts] = useState<SavedContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        async function fetchContacts() {
            setLoading(true);
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data } = await supabase
                        .from('users')
                        .select('saved_contacts')
                        .eq('id', user.id)
                        .single();

                    if (data?.saved_contacts) {
                        setSavedContacts(data.saved_contacts);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch contacts', error);
            } finally {
                setLoading(false);
            }
        }
        fetchContacts();
    }, []);

    const handleSelect = (contact: SavedContact) => {
        // Format: "Type: Value" or just "Value"?
        // Used to be just value, but "Type: Value" is clearer?
        // Existing data likely just has the value.
        // User request says "save snapshot". 
        // Let's just use the value. If user wants to include type, they can type "QQ: 123".
        // But the chips show type.
        // Let's stick to just value for now to be backward compatible, 
        // OR format it as "Type: Value" if the value doesn't look self-explanatory?
        // Let's just set the value. The user can edit it.
        onChange(`${contact.label || contact.type}: ${contact.value}`);
    };

    return (
        <div className="space-y-2">
            <div className="relative">
                <input
                    type="text"
                    readOnly
                    value={value}
                    onClick={() => setExpanded(!expanded)}
                    placeholder={placeholder}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none pr-10 cursor-pointer bg-white"
                />
                <button
                    type="button"
                    onClick={() => setExpanded(!expanded)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                >
                    {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
            </div>

            {/* Quick Select Chips */}
            {savedContacts.length > 0 && expanded && (
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 animate-in slide-in-from-top-2">
                    <div className="text-xs text-gray-500 mb-2 flex justify-between items-center">
                        <span>请选择首选联系方式 (将发送给管理员):</span>
                        <Link href="/user?tab=contacts" className="text-indigo-600 hover:underline">管理</Link>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        {savedContacts.map((c, i) => {
                            const Icon = TYPE_ICONS[c.type] || MessageCircle;
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => {
                                        handleSelect(c);
                                        setExpanded(false);
                                    }}
                                    className="flex items-center text-left p-2 bg-white border border-gray-200 rounded hover:border-indigo-300 hover:bg-indigo-50 transition text-sm group"
                                >
                                    <Icon size={14} className="mr-2 text-gray-400 group-hover:text-indigo-500" />
                                    <span className="font-medium text-gray-700 mr-2">{c.label || c.type}</span>
                                    <span className="text-gray-500 truncate flex-1">{c.value}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {savedContacts.length === 0 && !loading && (
                <div className="text-xs text-gray-400 text-right">
                    <Link href="/user?tab=contacts" className="hover:text-indigo-600 hover:underline">
                        设置常用联系方式可快速填写
                    </Link>
                </div>
            )}
        </div>
    );
}
