
import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { JobType, ExperienceLevel } from '@/types';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';

interface JobFiltersProps {
    searchTerm: string;
    setSearchTerm: (value: string) => void;
    jobTypes: JobType[];
    setJobTypes: (types: JobType[]) => void;
    experienceLevels: ExperienceLevel[];
    setExperienceLevels: (levels: ExperienceLevel[]) => void;
    budgetMin: number;
    setBudgetMin: (value: number) => void;
    budgetMax: number;
    setBudgetMax: (value: number) => void;
}

const CheckboxGroup: React.FC<{ title: string; options: string[]; selected: string[]; onChange: (selected: string[]) => void; translationKey: string; }> = ({ title, options, selected, onChange, translationKey }) => {
    const { t } = useTranslation();
    const handleToggle = (option: string) => {
        if (selected.includes(option)) {
            onChange(selected.filter(item => item !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    return (
        <div>
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">{title}</h4>
            <div className="space-y-2">
                {options.map(option => (
                    <label key={option} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                        <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                            checked={selected.includes(option)}
                            onChange={() => handleToggle(option)}
                        />
                        <span>{t(`${translationKey}.${option.toLowerCase().replace('-', '_')}`, {defaultValue: option})}</span>
                    </label>
                ))}
            </div>
        </div>
    );
};

const JobFilters: React.FC<JobFiltersProps> = ({
    searchTerm, setSearchTerm,
    jobTypes, setJobTypes,
    experienceLevels, setExperienceLevels,
    budgetMin, setBudgetMin,
    budgetMax, setBudgetMax
}) => {
    const { t } = useTranslation();

    return (
        <Card className="p-6 space-y-6">
            <h3 className="text-lg font-bold">{t('components.filters.title')}</h3>
            <Input 
                placeholder={t('components.filters.searchPlaceholder')} 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
            />
            
            <CheckboxGroup 
                title={t('components.filters.jobType')}
                options={['Fixed-Price', 'Hourly']}
                selected={jobTypes}
                onChange={setJobTypes}
                translationKey="shared.jobTypes"
            />
            
            <CheckboxGroup 
                title={t('components.filters.experienceLevel')}
                options={['Entry', 'Intermediate', 'Expert']}
                selected={experienceLevels}
                onChange={setExperienceLevels}
                translationKey="shared.experienceLevels"
            />
            
            <div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">{t('components.filters.budget')}</h4>
                <div className="flex items-center gap-2">
                    <Input 
                        type="number" 
                        placeholder={t('components.filters.min')}
                        value={budgetMin || ''} 
                        onChange={e => setBudgetMin(Number(e.target.value))}
                        aria-label="Minimum budget"
                    />
                    <span>-</span>
                    <Input 
                        type="number" 
                        placeholder={t('components.filters.max')}
                        value={budgetMax || ''} 
                        onChange={e => setBudgetMax(Number(e.target.value))}
                        aria-label="Maximum budget"
                    />
                </div>
            </div>
        </Card>
    );
};

export default JobFilters;
