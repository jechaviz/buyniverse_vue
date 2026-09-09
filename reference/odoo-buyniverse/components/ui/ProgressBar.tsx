
import React from 'react';

interface ProgressBarProps {
    progress: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
    const cappedProgress = Math.max(0, Math.min(100, progress));

    return (
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${cappedProgress}%` }}
            ></div>
        </div>
    );
};

export default ProgressBar;
