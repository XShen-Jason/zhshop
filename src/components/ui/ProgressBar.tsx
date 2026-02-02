import React from 'react';

interface ProgressBarProps {
    current: number;
    target: number;
    colorClass?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ current, target, colorClass = "bg-indigo-600" }) => {
    const percentage = Math.min((current / target) * 100, 100);
    return (
        <div className="w-full bg-gray-100 rounded-full h-2.5 mt-2">
            <div
                className={`h-2.5 rounded-full transition-all duration-500 ${colorClass}`}
                style={{ width: `${percentage}%` }}
            />
        </div>
    );
};
