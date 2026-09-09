
import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    wrapperClassName?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, id, className, wrapperClassName, ...props }, ref) => {
    const textareaId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined);
    return (
        <div className={wrapperClassName}>
            {label && <label htmlFor={textareaId} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>}
            <textarea
                id={textareaId}
                ref={ref}
                className={`block w-full px-4 py-2 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm transition-colors duration-200 ${className || ''}`}
                rows={4}
                {...props}
            />
        </div>
    );
});
Textarea.displayName = 'Textarea';

export default Textarea;
