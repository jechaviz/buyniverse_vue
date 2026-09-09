import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  description?: string;
  icon?: string;
  colorClass: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, description, icon, colorClass }) => {
    // Determine the type of card based on props
    const isBenefitCard = !!icon;
    const isSimpleStat = !description;

    if (isBenefitCard) {
        return (
             <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm flex items-center gap-4 border border-slate-200/80 dark:border-slate-700/80">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl ${colorClass}`}>
                    <i className={`fa-solid ${icon}`}></i>
                </div>
                <div>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
                    {description && <p className="text-xs text-slate-400 dark:text-slate-500">{description}</p>}
                </div>
            </div>
        );
    }
    
    // Default to invoice/payment/estimate style stat card
    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm relative border border-slate-200/80 dark:border-slate-700/80">
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                {title} {description && `(${description})`}
            </p>
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${colorClass} rounded-b-xl`}></div>
        </div>
    );
};

export default StatCard;
