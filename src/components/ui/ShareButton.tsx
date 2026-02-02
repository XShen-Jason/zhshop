'use client';

import React from 'react';
import { Share2, Check, Copy } from 'lucide-react';
import { useToast } from '@/lib/GlobalToast';

interface ShareButtonProps {
    title?: string;
    text?: string;
    url?: string;
    className?: string;
}

export function ShareButton({ title, text, url, className = '' }: ShareButtonProps) {
    const { showToast } = useToast();

    const handleShare = async () => {
        const shareUrl = url || window.location.href;
        const shareData = {
            title: title || document.title,
            text: text,
            url: shareUrl,
        };

        // Try Web Share API first (Mobile)
        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
                return;
            } catch (err) {
                // Ignore AbortError (user cancelled)
                if ((err as Error).name !== 'AbortError') {
                    console.error('Share failed', err);
                }
            }
        }

        // Fallback to Clipboard (Modern)
        if (navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(shareUrl);
                showToast('链接已复制到剪贴板', 'success');
                return;
            } catch (err) {
                console.warn('Clipboard API failed', err);
            }
        }

        // Legacy Fallback (for HTTP or unsupported browsers)
        try {
            const textArea = document.createElement('textarea');
            textArea.value = shareUrl;

            // Ensure it's not visible but part of DOM
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            textArea.style.top = '0';
            document.body.appendChild(textArea);

            textArea.focus();
            textArea.select();

            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);

            if (successful) {
                showToast('链接已复制到剪贴板', 'success');
            } else {
                showToast('复制失败，请手动复制', 'error');
            }
        } catch (err) {
            console.error('Legacy copy failed', err);
            showToast('复制失败', 'error');
        }
    };

    return (
        <button
            onClick={handleShare}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors font-medium ${className}`}
            title="分享此页面"
        >
            <Share2 size={18} />
            <span>分享</span>
        </button>
    );
}
