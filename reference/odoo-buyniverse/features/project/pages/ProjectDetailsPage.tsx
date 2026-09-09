import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { NotFoundPage } from '@/features/notfound';
import { useTranslation } from '@/hooks/useTranslation';
import { Job, JobStatus, SourcingType } from '@/types';
import { 
    DataTableCommentView,
    FileEditorView,
    DataTableMilestoneView
} from '@/features/common';
import ProjectInfoDisplay from '../components/ProjectInfoDisplay';
import ProjectLaunchpad from '../components/ProjectLaunchpad';
import ProviderSourcingView from '../components/ProviderSourcingView';
import { InviteFreelancersModal } from '@/features/freelancer';

const ProjectDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { jobs } = useAppState();
    const { t } = useTranslation();
    const dispatch = useAppDispatch();

    const project = jobs.find(j => j.id === id);

    const [activeTab, setActiveTab] = useState('Providers');
    const [initiallySelectedFileId, setInitiallySelectedFileId] = useState<string | null>(null);
    const [isInviteModalOpen, setInviteModalOpen] = useState(false);
    
    const isPreHiringPhase = project?.status === JobStatus.Draft || project?.status === JobStatus.PendingApproval || project?.status === JobStatus.RFI || (project?.status === JobStatus.Open && !project.contractId);


    const handleNavigateToTab = (tab: string, fileId?: string) => {
        if (fileId) {
            setInitiallySelectedFileId(fileId);
        }
        setActiveTab(tab);
    }
    
    useEffect(() => {
        if (activeTab !== 'Files') {
            setInitiallySelectedFileId(null);
        }
    }, [activeTab]);

    if (!project) {
        return <NotFoundPage />;
    }
    
    const handleUpdateProject = (updates: Partial<Job>) => {
        dispatch({ type: 'UPDATE_JOB', payload: { jobId: project.id, data: updates } });
    };
    
    const handlePublish = () => {
        const finalStatus = (project.approvers || []).length > 0 ? JobStatus.PendingApproval : JobStatus.Open;
        dispatch({ type: 'UPDATE_JOB', payload: { jobId: project.id, data: { status: finalStatus } } });
    };
    
    const handleShortlist = (providerIds: string[]) => {
        dispatch({ type: 'SHORTLIST_FOR_PROPOSAL', payload: { jobId: project.id, providerIds } });
        // Optionally, navigate the user or show a confirmation
    };

    const tabs = [
        { name: t('pages.project.details.details'), key: 'Details' },
        { name: t('pages.project.details.providers.title'), key: 'Providers' },
        { name: t('pages.project.details.milestones.title'), key: 'Milestones' },
        { name: t('pages.project.details.files'), key: 'Files' },
        { name: t('pages.project.details.comments'), key: 'Comments' },
    ];

    const tabClass = (tabKey: string) => 
        `px-1 pb-3 text-sm font-semibold transition-all duration-200 border-b-2 whitespace-nowrap ${
            activeTab === tabKey
            ? 'border-primary-600 text-primary-600 dark:text-primary-400'
            : 'border-transparent text-slate-500 hover:border-primary-500/50 hover:text-slate-700 dark:hover:text-slate-300'
        }`;
        
    return (
        <>
            <div className="space-y-6">
                {isPreHiringPhase && (
                    <ProjectLaunchpad 
                        project={project}
                        onInvite={() => setInviteModalOpen(true)}
                        onPublish={handlePublish}
                        onShortlist={handleShortlist}
                    />
                )}

                {/* Header */}
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">{project.title}</h1>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-slate-200 dark:border-slate-700">
                    <nav className="flex -mb-px gap-6 overflow-x-auto">
                        {tabs.map(tab => (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={tabClass(tab.key)}>
                                {tab.name}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="animate-fade-in">
                    {activeTab === 'Details' && (
                        <ProjectInfoDisplay 
                            project={project} 
                            onNavigate={handleNavigateToTab}
                            onUpdate={handleUpdateProject}
                        />
                    )}

                    {activeTab === 'Providers' && (
                        <ProviderSourcingView project={project} />
                    )}
                    
                    {activeTab === 'Milestones' && (
                        <DataTableMilestoneView project={project} />
                    )}

                    {activeTab === 'Files' && (
                        <FileEditorView project={project} initiallySelectedFileId={initiallySelectedFileId} />
                    )}

                    {activeTab === 'Comments' && (
                        <DataTableCommentView project={project} />
                    )}
                </div>
            </div>
             <InviteFreelancersModal isOpen={isInviteModalOpen} onClose={() => setInviteModalOpen(false)} job={project} />
        </>
    );
};

export default ProjectDetailsPage;