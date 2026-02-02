'use client';

import React from 'react';
import { Share2, Copy } from 'lucide-react';
import { useToast } from '@/lib/GlobalToast';

interface ShareButtonProps {
    title: string;
    text?: string;
    url?: string;
    className?: string; // Allow custom styling
}

export function ShareButton({ title, text, url, className }: ShareButtonProps) {
    const { showToast } = useToast();

    const handleShare = async () => {
        const shareUrl = url || window.location.href;
        const shareData = {
            title: title,
            text: text || `Check out ${title}`,
            url: shareUrl,
        };

        // Try native share
        if (navigator.share) {
            try {
                await navigator.share(shareData);
                return;
            } catch (err) {
                // User cancelled or error, fall back to clipboard
                console.log('Share cancelled or failed, falling back to clipboard');
            }
        }

        // Fallback: Copy to clipboard
        try {
            await navigator.clipboard.writeText(shareUrl);
            showToast('链接已复制到剪贴板！', 'success');
        } catch (err) {
            console.error('Failed to copy: ', err);
            showToast('复制失败', 'error');
        }
    };

    return (
        <button
            onClick={handleShare}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition font-medium text-sm ${className || ''}`}
            title="分享此页面"
        >
            <Share2 size={16} />
            <span>分享</span>
        </button>
    );
}
