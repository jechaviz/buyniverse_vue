import React from 'react';
import Tooltip from './Tooltip';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    wrapperClassName?: string;
    tooltip?: string;
    error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ label, id, className, wrapperClassName, tooltip, error, ...props }, ref) => {
    const inputId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined);
    return (
        <div className={wrapperClassName}>
            {label && (
                <div className="flex items-center gap-1 mb-1">
                    <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
                    {tooltip && (
                        <Tooltip content={tooltip}>
                            <i className="fa-solid fa-circle-info text-slate-400 cursor-help"></i>
                        </Tooltip>
                    )}
                </div>
            )}
            <input
                id={inputId}
                ref={ref}
                className={`block w-full px-4 py-2 text-slate-900 dark:text-slate-200 border rounded-lg bg-white dark:bg-slate-700/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm transition-colors duration-200 ${error ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} ${className || ''}`}
                {...props}
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
});
Input.displayName = 'Input';

export default Input;