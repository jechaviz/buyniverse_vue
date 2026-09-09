
import React from 'react';

interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
    children: React.ReactNode;
}

const Tag: React.FC<TagProps> = ({ children, className, ...props }) => {
    return (
        <span
            className={`inline-block bg-primary-100 text-primary-800 text-xs font-medium px-2.5 py-1 rounded-full dark:bg-primary-500/20 dark:text-primary-300 ${className || ''}`}
            {...props}
        >
            {children}
        </span>
    );
};

export default Tag;
