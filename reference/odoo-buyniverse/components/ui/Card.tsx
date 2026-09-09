import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, children, ...props }, ref) => (
    <div
        ref={ref}
        className={`bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm ${className || ''}`}
        {...props}
    >
        {children}
    </div>
));
Card.displayName = "Card";

export default Card;