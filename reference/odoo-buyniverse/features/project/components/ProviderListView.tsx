import React, { useMemo, useState } from 'react';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { Job, User, UserType, Proposal, ProposalQualificationStatus, NotificationType } from '@/types';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { useTranslation } from '@/hooks/useTranslation';
import { Link } from 'react-router-dom';
import StarRating from '@/components/ui/StarRating';
import ProviderListCardWrapper from './ProviderListCard';
import Dropdown from '@/components/ui/Dropdown';
import Button from '@/components/ui/Button';

type ProviderSelectionStatus = 'Matched (Preselected)' | 'Ignored' | 'Invited' | 'Suggested' | 'Other';

interface ProviderRowData extends User {
    selectionStatus: ProviderSelectionStatus;
    avgRating: number;
    reviewsCount: number;
    proposal?: Proposal;
}


const ProviderListView: React.FC<{ project: Job }> = ({ project }) => {
    const { users, reviews, currentUser } = useAppState();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

    const providerData = useMemo<ProviderRowData[]>(() => {
        return users
            .filter(u => u.type === UserType.Freelancer)
            .map(user => {
                let selectionStatus: ProviderSelectionStatus = 'Other';

                const isShortlisted = project.shortlistedProviderIds?.includes(user.id);
                const isIgnored = project.ignoredProviderIds?.includes(user.id);
                const isInvited = project.invitedFreelancerIds?.includes(user.id);

                const categoryMatch = !project.category || user.category === project.category;
                const skillMatch = project.skills.length === 0 || project.skills.some(s => user.skills?.includes(s));
                const isSuggested = categoryMatch && skillMatch;

                if (isShortlisted) {
                    selectionStatus = 'Matched (Preselected)';
                } else if (isIgnored) {
                    selectionStatus = 'Ignored';
                } else if (isInvited) {
                    selectionStatus = 'Invited';
                } else if (isSuggested) {
                    selectionStatus = 'Suggested';
                }
                
                const userReviews = reviews.filter(r => r.toUserId === user.id);
                const avgRating = userReviews.length > 0 ? userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length : 0;
                const proposal = project.proposals.find(p => p.freelancerId === user.id);

                return {
                    ...user,
                    selectionStatus,
                    avgRating,
                    reviewsCount: userReviews.length,
                    proposal,
                };
            });
    }, [users, reviews, project]);
    
    const columns = useMemo<ColumnDef<ProviderRowData>[]>(() => [
        {
            accessorKey: 'name',
            header: () => t('pages.project.details.providers.headers.provider'),
            cell: ({ row }) => (
                <Link to={`/profile/${row.id}`} className="flex items-center gap-2">
                    <img src={row.avatarUrl} alt={row.name} className="w-8 h-8 rounded-full" loading="lazy" decoding="async" />
                    <span className="font-medium">{row.name}</span>
                </Link>
            ),
            enableSorting: true,
            enableFiltering: true,
        },
        {
            accessorKey: 'headline',
            header: () => t('pages.project.details.providers.headers.headline'),
            cell: ({ row }) => <p className="line-clamp-2">{row.headline}</p>,
        },
        {
            accessorKey: 'selectionStatus',
            header: () => t('pages.project.details.providers.headers.selection'),
            cell: ({ row }) => row.selectionStatus,
            enableFiltering: true,
        },
        {
            accessorKey: 'avgRating',
            header: () => t('pages.project.details.providers.headers.rating'),
            cell: ({ row }) => <div className="flex items-center gap-1"><StarRating rating={row.avgRating} /> ({row.reviewsCount})</div>,
            enableSorting: true,
        },
        {
            accessorKey: 'skills',
            header: () => t('pages.project.details.providers.headers.topSkills'),
            cell: ({ row }) => (row.skills || []).slice(0, 3).join(', '),
        },
        {
            accessorKey: 'action',
            header: () => t('common.table.actions'),
            cell: ({ row: provider }) => {
                const handleSetGroup = (targetGroup: 'shortlisted' | 'ignored' | 'suggested' | 'invited') => {
                    dispatch({ type: 'SET_PROVIDER_GROUP', payload: { jobId: project.id, providerId: provider.id, targetGroup } });
                };
                
                const handleInvite = () => {
                     const notification = {
                        id: `notif-invite-${Date.now()}`,
                        userId: provider.id,
                        type: NotificationType.INVITED_TO_JOB,
                        text: `${currentUser.name} has invited you to apply for the job: "${project.title}"`,
                        link: `/job/${project.id}`,
                        isRead: false,
                        createdAt: new Date(),
                    };
                    dispatch({ type: 'INVITE_FREELANCER', payload: { jobId: project.id, freelancerId: provider.id, notification } });
                };

                const handleQualificationChange = (status: ProposalQualificationStatus) => {
                    dispatch({ type: 'UPDATE_PROPOSAL_QUALIFICATION', payload: { jobId: project.id, providerId: provider.id, status } });
                };
                
                return (
                    <div className="text-center">
                        <Dropdown
                            align="right"
                            trigger={<Button variant="ghost" size="sm" className="w-8 h-8"><i className="fa-solid fa-ellipsis-h"></i></Button>}
                        >
                            <div className="w-48 py-1">
                                 <Link to={`/profile/${provider.id}`} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">{t('pages.project.details.viewProfile')}</Link>
                                 {provider.proposal && <Link to={`/project/${project.id}`} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">{t('pages.project.details.viewProposal')}</Link>}
                                 <div className="my-1 h-px bg-slate-200 dark:bg-slate-700" />
                                 {!provider.proposal && provider.selectionStatus !== 'Invited' && <button onClick={handleInvite} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">{t('pages.project.details.invite')}</button>}
                                 {provider.selectionStatus !== 'Matched (Preselected)' && <button onClick={() => handleSetGroup('shortlisted')} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">{t('pages.project.details.shortlist')}</button>}
                                 {provider.selectionStatus !== 'Ignored' && <button onClick={() => handleSetGroup('ignored')} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">{t('pages.project.details.ignore')}</button>}
                                 {provider.selectionStatus === 'Ignored' && <button onClick={() => handleSetGroup('suggested')} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">{t('pages.project.details.moveToSuggested')}</button>}
                                 {provider.proposal && (
                                     <>
                                         <div className="my-1 h-px bg-slate-200 dark:bg-slate-700" />
                                         <Dropdown
                                            align="right"
                                            trigger={<button className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex justify-between items-center"><span>{t('pages.project.details.manageQualification')}</span> <i className="fa-solid fa-chevron-right text-xs"></i></button>}
                                         >
                                             <div className="py-1">
                                                {Object.values(ProposalQualificationStatus).map(status => (
                                                    <button key={status} onClick={() => handleQualificationChange(status)} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">{t(`pages.project.details.statuses.${(status as string).toLowerCase()}`, { defaultValue: status })}</button>
                                                ))}
                                             </div>
                                         </Dropdown>
                                     </>
                                 )}
                            </div>
                        </Dropdown>
                    </div>
                );
            }
        },
    ], [t, project, dispatch, currentUser]);

    return (
        <DataTable
            columns={columns}
            data={providerData}
            idKey="id"
            globalFilter={searchTerm}
            onGlobalFilterChange={setSearchTerm}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            initialGroupByColumns={['selectionStatus']}
            pageTitle="Providers"
            renderCard={ProviderListCardWrapper}
        />
    );
};

export default ProviderListView;