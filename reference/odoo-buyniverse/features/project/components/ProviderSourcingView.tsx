import React, { useState } from 'react';
import { Job, ContestStatus, JobType } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import ProviderListView from './ProviderListView';
import ProposalsView from './ProposalsView';
import { useAppState } from '@/context/AppStateContext';
import { Link } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { CreateContestModal } from '@/features/contest';
import Tag from '@/components/ui/Tag';


interface ProviderSourcingViewProps {
    project: Job;
}

const ProviderSourcingView: React.FC<ProviderSourcingViewProps> = ({ project }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'providers' | 'proposals'>('providers');
    const { contests, currentUser } = useAppState();
    const [isContestModalOpen, setContestModalOpen] = useState(false);

    const contest = contests.find(c => c.jobId === project.id);
    const canStartContest = project.proposals.length > 1 && project.budget.type === JobType.FixedPrice && !project.contractId && !contest;
    const isClientOwner = project.clientId === currentUser.id;

    const tabClass = (tabName: 'providers' | 'proposals') =>
        `px-4 py-2 font-semibold transition-colors ${
            activeTab === tabName
            ? 'border-b-2 border-primary-600 text-primary-600 dark:text-primary-400'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
        }`;

    const renderContestStatus = () => {
        if (!isClientOwner) return null;

        let statusNode: React.ReactNode = null;
        let actionNode: React.ReactNode = null;

        if (contest) {
            if (contest.winnerId) {
                statusNode = <Tag className="bg-green-500 text-white">{t('pages.project.details.contest.winnerSelected')}</Tag>;
            } else if (contest.status === ContestStatus.Finished) {
                statusNode = <Tag className="bg-purple-500 text-white">{t('pages.project.details.contest.contestFinished')}</Tag>;
            } else {
                statusNode = <Tag className="bg-blue-500 text-white">{t('pages.project.details.contest.contestActive')}</Tag>;
            }
            actionNode = <Link to={`/contest/${project.id}`}><Button>{t('pages.project.details.contest.viewContest')}</Button></Link>;
        } else if (canStartContest) {
            actionNode = <Button onClick={() => setContestModalOpen(true)}>{t('pages.project.details.contest.startContest')}</Button>;
        } else {
             if (project.budget.type !== JobType.FixedPrice) {
                 statusNode = <p className="text-sm text-slate-500">{t('pages.project.details.contest.contestNotAvailable')}</p>
             }
        }

        return (
            <Card className="p-4 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <div>{statusNode}</div>
                <div>{actionNode}</div>
            </Card>
        );
    }
    
    return (
        <>
            <div className="space-y-4">
                {renderContestStatus()}
                <div className="flex border-b border-slate-200 dark:border-slate-700">
                    <button onClick={() => setActiveTab('providers')} className={tabClass('providers')}>
                        {t('pages.project.details.providers.title')}
                    </button>
                    <button onClick={() => setActiveTab('proposals')} className={tabClass('proposals')}>
                        {t('pages.project.details.proposals.title')}
                    </button>
                </div>

                {activeTab === 'providers' && <ProviderListView project={project} />}
                {activeTab === 'proposals' && <ProposalsView project={project} />}
            </div>
            {isClientOwner && canStartContest && (
                <CreateContestModal isOpen={isContestModalOpen} onClose={() => setContestModalOpen(false)} job={project} />
            )}
        </>
    );
};

export default ProviderSourcingView;