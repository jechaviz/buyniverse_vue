
import React from 'react';
import { useAppState } from '@/context/AppStateContext';
import { useTranslation } from '@/hooks/useTranslation';
import { Job, User } from '@/types';
import Card from '@/components/ui/Card';
import { Link } from 'react-router-dom';

interface ActivityFeedProps {
  project: Job;
}

const timeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return `${Math.floor(interval)}y ago`;
    interval = seconds / 2592000;
    if (interval > 1) return `${Math.floor(interval)}mo ago`;
    interval = seconds / 86400;
    if (interval > 1) return `${Math.floor(interval)}d ago`;
    interval = seconds / 3600;
    if (interval > 1) return `${Math.floor(interval)}h ago`;
    interval = seconds / 60;
    if (interval > 1) return `${Math.floor(interval)}m ago`;
    return `just now`;
}

const ActivityIcon: React.FC<{type: string}> = ({type}) => {
    const iconMap = {
        'COMMENT': 'fa-regular fa-comment',
        'STATUS_CHANGE': 'fa-solid fa-flag',
        'TASK_ASSIGNED': 'fa-solid fa-user-plus',
        'ESTIMATE_CREATED': 'fa-solid fa-file-invoice',
    }
    const icon = iconMap[type as keyof typeof iconMap] || 'fa-solid fa-bell';
    return (
        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
            <i className={`${icon} text-slate-500`}></i>
        </div>
    )
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ project }) => {
  const { t } = useTranslation();
  const { users } = useAppState();

  const activities = project.activity || [];

  return (
    <Card className="p-6">
      <h3 className="font-bold text-lg mb-4">{t('pages.project.details.activityFeed')}</h3>
      {activities.length > 0 ? (
        <ul className="space-y-4">
            {activities.map(activity => {
                const user = users.find(u => u.id === activity.userId);
                return (
                    <li key={activity.id} className="flex gap-3">
                        <ActivityIcon type={activity.type} />
                        <div>
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                <span className="font-semibold">{user?.name}</span> {activity.text} {activity.link && <Link to={activity.link.url} className="text-primary-600 hover:underline">{activity.link.text}</Link>}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">{timeAgo(activity.timestamp)}</p>
                        </div>
                    </li>
                )
            })}
        </ul>
      ) : (
        <p className="text-sm text-slate-500 text-center py-4">No activity yet.</p>
      )}
    </Card>
  );
};

export default ActivityFeed;
