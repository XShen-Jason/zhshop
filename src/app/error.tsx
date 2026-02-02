'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">哎呀，出错了</h2>
            <p className="text-gray-600 mb-8 max-w-md">
                我们遇到了一些意料之外的问题。您可以尝试刷新页面。
            </p>
            <div className="flex gap-4">
                <button
                    onClick={() => reset()}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                >
                    重试
                </button>
                <Link
                    href="/"
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                >
                    返回首页
                </Link>
            </div>
            <div className="mt-12 text-xs text-gray-400 font-mono">
                Error Digest: {error.digest || 'Unknown'}
            </div>
        </div>
    );
}
