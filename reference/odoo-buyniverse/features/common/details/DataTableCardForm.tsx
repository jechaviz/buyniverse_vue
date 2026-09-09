import React from 'react';
import { Job, JobStatus, User } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';

interface DataTableCardFormProps<T extends { [key: string]: any }> {
  data: T;
  onUpdate: (updates: Partial<T>) => void;
  users: User[];
}

const DataTableCardForm: React.FC<DataTableCardFormProps<Job>> = ({ data: project, onUpdate, users }) => {
  const { t } = useTranslation();
  
  const handleSkillsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const skills = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
    onUpdate({ skills });
  };
  
  const formatDateForInput = (date?: Date): string => {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
            <Card className="p-6">
                 <Textarea label={t('pages.job.post.jobDescription')} value={project.description} onChange={e => onUpdate({description: e.target.value})} rows={10}/>
            </Card>
             <Card className="p-6">
                <Input label={t('pages.job.post.skills')} value={project.skills.join(', ')} onChange={handleSkillsChange} />
            </Card>
        </div>
        <div className="space-y-6">
            <Card className="p-6 space-y-4">
                 <Input label={t('pages.project.details.startDate')} type="date" value={formatDateForInput(project.startDate)} onChange={e => onUpdate({ startDate: new Date(e.target.value) })} />
                 <Input label={t('pages.project.details.dueDate')} type="date" value={formatDateForInput(project.dueDate)} onChange={e => onUpdate({ dueDate: new Date(e.target.value) })} />
                <Input label={t('pages.project.details.category')} value={project.category || ''} onChange={e => onUpdate({category: e.target.value})} />
                <div>
                     <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('pages.project.details.status')}</label>
                     <select value={project.status} onChange={e => onUpdate({ status: e.target.value as JobStatus })} className="block w-full px-4 py-2 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm">
                        {Object.values(JobStatus).map(s => <option key={s} value={s}>{(s as string).replace(/_/g, ' ')}</option>)}
                    </select>
                </div>
            </Card>
            <Card className="p-6 space-y-4">
                <Input label={t('pages.project.details.billingType')} value={project.billingType || ''} onChange={e => onUpdate({billingType: e.target.value as any})} />
                <Input label={t('pages.project.details.rate')} type="number" value={project.rate || ''} onChange={e => onUpdate({rate: Number(e.target.value)})} />
                <Input label={t('pages.project.details.estimatedHours')} type="number" value={project.estimatedHours || ''} onChange={e => onUpdate({estimatedHours: Number(e.target.value)})} />
            </Card>
        </div>
    </div>
  );
};

export default DataTableCardForm;