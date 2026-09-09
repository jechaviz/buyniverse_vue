import React from 'react';

interface ButtonGroupProps {
    options: { label: React.ReactNode; value: string }[];
    selectedValue: string;
    onSelectionChange: (value: string) => void;
}

const ButtonGroup: React.FC<ButtonGroupProps> = ({ options, selectedValue, onSelectionChange }) => {
    return (
        <div className="inline-flex rounded-md shadow-sm" role="group">
            {options.map((option, index) => {
                const isFirst = index === 0;
                const isLast = index === options.length - 1;
                const isActive = selectedValue === option.value;
                
                const positionClasses = `
                    ${isFirst ? 'rounded-l-lg' : ''}
                    ${isLast ? 'rounded-r-lg' : ''}
                    ${!isFirst ? '-ml-px' : ''}
                `;
                
                const activeClasses = isActive
                    ? 'bg-primary-600 text-white border-primary-600 z-10'
                    : 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600';

                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onSelectionChange(option.value)}
                        className={`px-3 py-2 text-sm font-medium border focus:z-10 focus:ring-2 focus:ring-primary-500 transition-colors ${positionClasses} ${activeClasses}`}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
};

export default ButtonGroup;