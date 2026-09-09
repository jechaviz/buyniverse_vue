import React from 'react';
import { Job, SourcingType, JobStatus, ContestStatus } from '@/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
import { Link } from 'react-router-dom';
import { useAppState } from '@/context/AppStateContext';

interface ProjectLaunchpadProps {
    project: Job;
    onInvite: () => void;
    onPublish: () => void;
    onShortlist: (providerIds: string[]) => void;
}

const StepCard: React.FC<{ title: string; subtitle: string; status: 'complete' | 'current' | 'upcoming'; children: React.ReactNode; isLast?: boolean }> = ({ title, subtitle, status, children, isLast = false }) => {
    const statusStyles = {
        complete: {
            icon: 'fa-check',
            ring: 'ring-green-500',
            bg: 'bg-green-500',
            text: 'text-white'
        },
        current: {
            icon: 'fa-ellipsis',
            ring: 'ring-primary-500',
            bg: 'bg-primary-500',
            text: 'text-white'
        },
        upcoming: {
            icon: 'fa-hourglass-start',
            ring: 'ring-slate-300 dark:ring-slate-600',
            bg: 'bg-slate-300 dark:bg-slate-600',
            text: 'text-slate-600 dark:text-slate-300'
        },
    };
    
    const currentStatus = statusStyles[status];

    return (
        <div className="relative flex items-start flex-1">
            {!isLast && <div className="absolute top-5 left-5 -ml-px mt-1 w-px h-full bg-slate-300 dark:bg-slate-600"></div>}
            <div className="flex-shrink-0">
                 <div className={`w-10 h-10 rounded-full flex items-center justify-center ring-4 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-800/50 ${currentStatus.ring} ${currentStatus.bg}`}>
                    <i className={`fa-solid ${currentStatus.icon} ${currentStatus.text}`}></i>
                </div>
            </div>
            <div className="ml-4">
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{subtitle}</p>
                <div className={status === 'complete' ? 'opacity-60 pointer-events-none' : ''}>
                    {children}
                </div>
            </div>
        </div>
    );
}

const RfpFlow: React.FC<Omit<ProjectLaunchpadProps, 'onPublish'>> = (props) => {
    const { project } = props;
    const { contests } = useAppState();
    const { t } = useTranslation();
    
    const contest = contests.find(c => c.id === project.contestId);
    const hasProposals = project.proposals.length > 0;
    const isBiddingStarted = !!contest;
    const isBiddingFinished = contest?.status === ContestStatus.Finished;
    const isProjectAwarded = !!contest?.winnerId;

    const getStatus = (step: number): 'complete' | 'current' | 'upcoming' => {
        if (step === 1) return hasProposals ? 'complete' : 'current';
        if (step === 2) {
            if (isBiddingStarted) return 'complete';
            if (hasProposals) return 'current';
            return 'upcoming';
        }
        if (step === 3) {
            if (isProjectAwarded) return 'complete';
            if (isBiddingFinished) return 'current';
            return 'upcoming';
        }
        return 'upcoming';
    };

    return (
        <div className="flex flex-col md:flex-row gap-8">
            <StepCard 
                title={t('pages.project.details.launchpad.rfp.step1_title')} 
                subtitle={t('pages.project.details.launchpad.rfp.step1_subtitle')} 
                status={getStatus(1)}
            >
                <Link to={`/project/${project.id}`} state={{ defaultTab: 'Proposals' }}>
                    <Button variant="outline">{t('pages.project.details.launchpad.rfp.step1_action')}</Button>
                </Link>
            </StepCard>
            <StepCard
                title={t('pages.project.details.launchpad.rfp.step2_title')}
                subtitle={t('pages.project.details.launchpad.rfp.step2_subtitle')}
                status={getStatus(2)}
            >
                <p className="text-xs text-slate-500">Go to the 'Providers' tab to start a bidding event.</p>
            </StepCard>
            <StepCard
                title={t('pages.project.details.launchpad.rfp.step3_title')}
                subtitle={t('pages.project.details.launchpad.rfp.step3_subtitle')}
                status={getStatus(3)}
                isLast
            >
                <Link to={`/project/${project.id}/contest`}>
                    <Button variant="primary">{t('pages.project.details.launchpad.rfp.step3_action')}</Button>
                </Link>
            </StepCard>
        </div>
    )
}

const ProjectLaunchpad: React.FC<ProjectLaunchpadProps> = (props) => {
    const { project, onPublish } = props;
    const { t } = useTranslation();

    return (
        <Card className="p-6 bg-slate-50 dark:bg-slate-800/50 animate-fade-in-up">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                 <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{t('pages.project.details.launchpad.title')}</h2>
                 {(project.status === JobStatus.Draft || project.status === JobStatus.RFI) && (
                    <Button onClick={onPublish} size="lg">
                        <i className="fa-solid fa-rocket mr-2"></i>
                        {t('pages.project.details.launchpad.publish')}
                    </Button>
                 )}
            </div>
           
            {project.sourcingType === SourcingType.RFI ? <p>RFI Flow not yet implemented in launchpad.</p> : <RfpFlow {...props} />}
        </Card>
    );
};

export default ProjectLaunchpad;