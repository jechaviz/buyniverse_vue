import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { JobStatus, Job, SourcingType, ProjectLevel, Duration, UserType, JobType, ExperienceLevel } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import ProgressBar from '@/components/ui/ProgressBar';
import Tag from '@/components/ui/Tag';
import Button from '@/components/ui/Button';

const ProjectsPage: React.FC = () => {
    const { jobs, currentUser, tableAdminConfig } = useAppState();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [rowSelection, setRowSelection] = useState({});
    
    const adminConfig = tableAdminConfig['projects'];

    const userProjects = useMemo(() => {
        if (!currentUser) return [];
        switch (currentUser.type) {
            case UserType.Client:
                return jobs.filter(job => job.clientId === currentUser.id);
            case UserType.Freelancer:
                const freelancerJobs = new Set<string>();
                jobs.forEach(job => {
                    if (job.invitedFreelancerIds?.includes(currentUser.id)) {
                        freelancerJobs.add(job.id);
                    }
                    if (job.proposals.some(p => p.freelancerId === currentUser.id)) {
                        freelancerJobs.add(job.id);
                    }
                });
                return jobs.filter(job => freelancerJobs.has(job.id));
            case UserType.Admin:
                return jobs; // Admins see all projects
            default:
                return [];
        }
    }, [jobs, currentUser]);

    const handleSaveRecord = (record: Job) => {
        const exists = jobs.some(j => j.id === record.id);
        if (exists) {
            dispatch({ type: 'UPDATE_ENTITY', payload: { entity: 'jobs', id: record.id, data: record } });
        } else {
            dispatch({ type: 'ADD_JOB', payload: record });
        }
    };
    
    const handleUpdateCell = (rowId: string, columnId: string, value: any) => {
        if (columnId === 'progress') {
            dispatch({ type: 'UPDATE_JOB_PROGRESS', payload: { jobId: rowId, progress: value } });
        } else {
            dispatch({ type: 'UPDATE_ENTITY', payload: { entity: 'jobs', id: rowId, data: { [columnId]: value } } });
        }
    };

    const handleDeleteRecord = (recordId: string) => {
        if(window.confirm('Are you sure you want to delete this project?')) {
            // In a real app, we'd dispatch a DELETE_JOB action.
            console.log("Deleting job with ID:", recordId);
        }
    }
    
    const handleCreateJobDraft = () => {
        const newDraft: Job = {
            id: `job-draft-${Date.now()}`,
            clientId: currentUser.id,
            status: JobStatus.Draft,
            title: '',
            description: '',
            skills: [],
            budget: { type: JobType.FixedPrice, amount: 0 },
            postedAt: new Date(),
            proposals: [],
            experienceLevel: ExperienceLevel.Intermediate,
            requiresNDA: false,
            questions: [],
            approvers: [],
            team: [],
            connectsRequired: 0,
            invitedFreelancerIds: [],
            sourcingType: SourcingType.RFP,
            activity: [],
            milestoneCategories: [],
            comments: [],
            files: [],
            rfiResponses: [],
            shortlistedProviderIds: [],
            currency: currentUser.defaultCurrency || 'USD',
            visibility: 'private',
            projectLevel: ProjectLevel.Basic,
            duration: Duration.Month1To3,
            progress: 0,
        };
        dispatch({ type: 'CREATE_JOB_DRAFT', payload: newDraft });
        navigate(`/post-job/${newDraft.id}`);
    };
    
    const columns = useMemo<ColumnDef<Job>[]>(() => [
        {
            accessorKey: 'id',
            header: () => t('pages.project.list.table.id'),
            cell: ({ row }) => <Link to={`/project/${row.id}`} className="font-medium text-sky-600 hover:underline">#{row.id.slice(-4)}</Link>,
            enableSorting: true,
        },
        {
            accessorKey: 'title',
            header: () => t('pages.project.list.table.title'),
            cell: ({ row }) => <Link to={`/project/${row.id}`} className="font-medium">{row.title}</Link>,
            enableSorting: true,
            enableFiltering: true,
            editConfig: { type: 'text' },
        },
        {
            accessorKey: 'startDate',
            header: () => t('pages.project.list.table.startDate'),
            cell: ({ row }) => row.startDate ? new Date(row.startDate).toLocaleDateString() : '---',
            enableSorting: true,
            editConfig: { type: 'date' },
        },
        {
            accessorKey: 'dueDate',
            header: () => t('pages.project.list.table.dueDate'),
            cell: ({ row }) => row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '---',
            enableSorting: true,
            editConfig: { type: 'date' },
        },
        {
            accessorKey: 'skills',
            header: () => t('pages.project.list.table.tags'),
            cell: ({ row }) => (
                <div className="flex flex-wrap gap-1">
                    {row.skills.slice(0, 2).map(skill => <Tag key={skill}>{skill}</Tag>)}
                </div>
            ),
            editConfig: { type: 'tags' },
        },
        {
            accessorKey: 'progress',
            header: () => t('pages.project.list.table.progress'),
            cell: ({ row }) => (
                <div className="w-24">
                    <ProgressBar progress={row.progress || 0} />
                </div>
            ),
            enableSorting: true,
            editConfig: { type: 'slider' },
        },
        {
            accessorKey: 'status',
            header: () => t('pages.project.list.table.status'),
            cell: ({ row }) => <span className="text-sm font-medium">{row.status.replace(/_/g, ' ')}</span>,
            enableSorting: true,
            enableFiltering: true,
            editConfig: { type: 'select', options: Object.values(JobStatus).map(s => ({ value: s, label: s.replace(/_/g, ' ')}))},
        },
    ], [t]);
    
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                 <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{t('pages.project.list.title')}</h1>
                 {currentUser.permissions.canCreateProjects && (
                    <Button onClick={handleCreateJobDraft}>
                        <i className="fa-solid fa-plus mr-2"></i> {t('pages.project.list.addProject')}
                    </Button>
                 )}
            </div>
            <DataTable
                columns={columns}
                data={userProjects}
                globalFilter={searchTerm}
                onGlobalFilterChange={setSearchTerm}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                idKey="id"
                onSaveRecord={handleSaveRecord}
                onDeleteRecord={handleDeleteRecord}
                onUpdateCell={handleUpdateCell}
                initialGroupByColumns={['status']}
                enableCrud={currentUser.permissions.isWorkspaceAdmin}
                pageTitle={t('pages.project.list.title')}
            />
        </div>
    );
};

export default ProjectsPage;