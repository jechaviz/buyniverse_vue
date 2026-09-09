import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { Job, JobStatus, User, UserType } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { useTimeAgo } from '@/hooks/useTimeAgo';
import { useUsers } from '@/hooks/useUsers';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';

interface JobCardProps {
  job: Job;
}

const JobCard: React.FC<JobCardProps> = ({ job }) => {
  const { currentUser } = useAppState();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const timeAgo = useTimeAgo();
  const { getUserById } = useUsers();

  const client = getUserById(job.clientId);
  const isSaved = currentUser.savedJobs?.includes(job.id);
  
  const handleToggleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch({ type: 'TOGGLE_SAVE_JOB', payload: { jobId: job.id } });
  }
  
  const postedTimeAgo = useMemo(() => timeAgo(job.postedAt), [job.postedAt, timeAgo]);

  const budgetDisplay = job.budget.type === 'Hourly'
    ? `$${job.budget.amount.toLocaleString()}/hr`
    : `$${job.budget.amount.toLocaleString()}`;

  const getStatusTag = () => {
    const commonClasses = "text-xs font-bold py-1 px-2.5 rounded-full absolute top-4 right-4";
    switch(job.status) {
        case JobStatus.InProgress:
            return <div className={`${commonClasses} bg-blue-100 text-blue-800`}>{t('pages.job.card.status.inProgress')}</div>
        case JobStatus.Completed:
             return <div className={`${commonClasses} bg-purple-100 text-purple-800`}>{t('pages.job.card.status.completed')}</div>
        default:
            return null;
    }
  }

  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow duration-300">
      <div className="p-6 flex-grow">
        <div className="relative">
            {isSaved && <div className="text-xs font-bold py-1 px-2.5 rounded-full bg-yellow-100 text-yellow-800 absolute top-0 left-0">{t('pages.job.card.status.saved')}</div>}
            {getStatusTag()}
        </div>
        <p className="text-sm text-slate-500 mt-8">{t('pages.job.card.posted')} {postedTimeAgo} {t('pages.job.card.by')} {client?.name}</p>
        <Link to={`/job/${job.id}`}>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-2 mb-3 hover:text-primary-600 dark:hover:text-primary-400 transition-colors line-clamp-2">
            {job.title}
          </h3>
        </Link>
        <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3 mb-4">
          {job.description}
        </p>
        <div className="flex flex-wrap gap-1">
          {job.skills.slice(0, 3).map(skill => (
            <Tag key={skill}>{skill}</Tag>
          ))}
          {job.skills.length > 3 && (
            <Tag>+{job.skills.length - 3} {t('pages.job.card.more')}</Tag>
          )}
        </div>
      </div>
      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700/50 flex justify-between items-center">
        <div>
          <p className="text-xs text-slate-500">{t('pages.job.card.budget')}</p>
          <p className="font-bold text-slate-700 dark:text-slate-200">{budgetDisplay}</p>
        </div>
        {currentUser.type === UserType.Freelancer && (
            <button onClick={handleToggleSave} className={`text-xl transition-colors ${isSaved ? 'text-primary-500' : 'text-slate-400 hover:text-primary-400'}`} aria-label={isSaved ? t('pages.job.card.unsave') : t('pages.job.card.save')}>
                <i className={`fa-bookmark ${isSaved ? 'fa-solid' : 'fa-regular'}`}></i>
            </button>
        )}
      </div>
    </Card>
  );
};

export default React.memo(JobCard);
