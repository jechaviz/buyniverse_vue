
import React, { useMemo } from 'react';
import { Job, User } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppState } from '@/context/AppStateContext';
import Card from '@/components/ui/Card';
import ProgressBar from '@/components/ui/ProgressBar';
import Tag from '@/components/ui/Tag';
import Tooltip from '@/components/ui/Tooltip';

interface ProjectSummaryCardProps {
  project: Job;
}

const InfoItem: React.FC<{ label: string, children: React.ReactNode}> = ({ label, children }) => (
    <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <div className="text-md font-semibold text-slate-700 dark:text-slate-200 mt-1">{children}</div>
    </div>
);

const ProjectSummaryCard: React.FC<ProjectSummaryCardProps> = ({ project }) => {
  const { t } = useTranslation();
  const { users } = useAppState();

  const teamMembers = useMemo(() => project.team.map(member => users.find(u => u.id === member.userId)).filter(Boolean) as User[], [project.team, users]);
  const projectManager = users.find(u => u.id === project.projectManagerId);

  return (
    <Card className="p-6">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-bold">{t('pages.project.details.overview')}</h2>
        <Tag>{project.status.replace('_', ' ')}</Tag>
      </div>
      
      <div className="mb-6">
          <div className="flex justify-between items-center mb-1">
            <p className="text-sm font-medium">{t('pages.project.details.progress')}</p>
            <p className="text-sm font-bold">{project.progress || 0}%</p>
          </div>
          <ProgressBar progress={project.progress || 0} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <InfoItem label={t('pages.project.details.assigned')}>
             <div className="flex items-center -space-x-2">
                {teamMembers.slice(0, 4).map(user => (
                    <Tooltip key={user.id} content={user.name}>
                        <img src={user.avatarUrl || `https://i.pravatar.cc/40?u=${user.id}`} alt={user.name} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800" loading="lazy" decoding="async"/>
                    </Tooltip>
                ))}
                {teamMembers.length > 4 && <div className="h-8 w-8 rounded-full bg-slate-200 text-xs flex items-center justify-center border-2 border-white">+{teamMembers.length-4}</div>}
             </div>
        </InfoItem>
        <InfoItem label={t('pages.project.details.projectManager')}>
            {projectManager ? (
                 <div className="flex items-center gap-2">
                    <img src={projectManager.avatarUrl || `https://i.pravatar.cc/40?u=${projectManager.id}`} alt={projectManager.name} className="w-8 h-8 rounded-full" loading="lazy" decoding="async"/>
                    <span>{projectManager.name}</span>
                 </div>
            ) : 'N/A'}
        </InfoItem>
        <InfoItem label={t('pages.project.details.tags')}>
            <div className="flex flex-wrap gap-1">
                {project.skills.slice(0,2).map(skill => <Tag key={skill}>{skill}</Tag>)}
            </div>
        </InfoItem>
         <InfoItem label={t('pages.project.details.timeSpent')}>
            {project.timeSpent || 0} / {project.estimatedHours || 0} hrs
        </InfoItem>
      </div>
    </Card>
  );
};

export default ProjectSummaryCard;
