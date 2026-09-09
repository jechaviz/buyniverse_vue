
import React from 'react';

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    color?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', color = 'border-white' }) => {
    const sizeClasses = {
        sm: 'h-4 w-4 border-2',
        md: 'h-8 w-8 border-4',
        lg: 'h-16 w-16 border-8',
    };
    return (
        <div className={`animate-spin rounded-full ${sizeClasses[size]} ${color} border-t-transparent`} role="status" aria-label="Loading...">
            <span className="sr-only">Loading...</span>
        </div>
    );
};

export default Spinner;
