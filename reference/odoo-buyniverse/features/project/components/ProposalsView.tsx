import React, { useMemo } from 'react';
import { useAppDispatch, useAppState } from '@/context/AppStateContext';
import { Job, Contract, ContractType, NotificationType, Proposal, ContestStatus } from '@/types';
import { ProposalCard } from '@/features/proposal';
import Card from '@/components/ui/Card';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { Link } from 'react-router-dom';
import StarRating from '@/components/ui/StarRating';
import Tag from '@/components/ui/Tag';
import { useTranslation } from '@/hooks/useTranslation';

const ProposalsView: React.FC<{ project: Job }> = ({ project }) => {
    const dispatch = useAppDispatch();
    const { currentUser, users, reviews, contests } = useAppState();
    const { t } = useTranslation();

    const contest = contests.find(c => c.jobId === project.id);
    const isContestActive = contest?.status === ContestStatus.Active;

    const handleHire = (proposalId: string, freelancerId: string, freelancerName: string, bid: number) => {
        if (isContestActive) {
            alert("A contest is active. Please select a winner from the contest page.");
            return;
        }
        if (!window.confirm(`Are you sure you want to hire ${freelancerName}?`)) return;

        const contract: Contract = {
            id: `contract-${project.id}`,
            type: ContractType.Job,
            jobType: project.budget.type,
            sourceId: project.id,
            clientId: currentUser.id,
            providerId: freelancerId,
            rateOrBid: bid,
            startedAt: new Date(),
            milestones: [],
        };
        
        const notification = {
            id: `notif-hired-${Date.now()}`,
            userId: freelancerId,
            type: NotificationType.HIRED,
            text: `You have been hired for the job: "${project.title}"!`,
            link: `/contract/${contract.id}`,
            isRead: false,
            createdAt: new Date(),
        };

        dispatch({
            type: 'HIRE_FREELANCER',
            payload: {
                jobId: project.id,
                proposalId,
                contract,
                notification,
            }
        });
    };
    
    const proposalData = useMemo(() => {
        return project.proposals.map(proposal => {
            const freelancer = users.find(u => u.id === proposal.freelancerId);
            const freelancerReviews = reviews.filter(r => r.toUserId === proposal.freelancerId);
            const avgRating = freelancerReviews.length > 0 ? freelancerReviews.reduce((sum, r) => sum + r.rating, 0) / freelancerReviews.length : 0;
            return {
                ...proposal,
                freelancer,
                avgRating,
                reviewsCount: freelancerReviews.length,
            };
        }).filter(p => p.freelancer) as (Proposal & { freelancer: NonNullable<typeof users[0]>, avgRating: number, reviewsCount: number })[]; // Ensure freelancer exists
    }, [project.proposals, users, reviews]);


    const columns = useMemo<ColumnDef<typeof proposalData[0]>[]>(() => [
        {
            accessorKey: 'freelancer',
            header: () => t('pages.project.details.proposalsView_headers.freelancer'),
            cell: ({ row }) => (
                <Link to={`/profile/${row.freelancer.id}`} className="flex items-center gap-2">
                    <img src={row.freelancer.avatarUrl} alt={row.freelancer.name} className="w-8 h-8 rounded-full" />
                    <div>
                        <p className="font-semibold">{row.freelancer.name}</p>
                        <p className="text-xs text-slate-500 line-clamp-1">{row.freelancer.headline}</p>
                    </div>
                </Link>
            )
        },
        {
            accessorKey: 'avgRating',
            header: () => t('pages.project.details.proposalsView_headers.rating'),
            cell: ({ row }) => <div className="flex items-center gap-1"><StarRating rating={row.avgRating} /> ({row.reviewsCount})</div>
        },
        {
            accessorKey: 'bid',
            header: () => t('pages.project.details.proposalsView_headers.bid'),
            cell: ({ row }) => `$${row.bid.toLocaleString()}`
        },
        {
            accessorKey: 'submittedAt',
            header: () => t('pages.project.details.proposalsView_headers.submitted'),
            cell: ({ row }) => new Date(row.submittedAt).toLocaleDateString()
        },
        {
            accessorKey: 'status',
            header: () => t('pages.project.details.proposalsView_headers.status'),
            cell: ({ row }) => <Tag>{row.status}</Tag>
        }
    ], [t]);


    if (project.proposals.length === 0) {
        return (
            <Card className="p-8 text-center text-slate-500">
                {t('pages.project.details.proposals.noProposals')}
            </Card>
        );
    }

    return (
        <DataTable
            columns={columns}
            data={proposalData}
            idKey="id"
            initialView="cards"
            renderCard={(proposal) => {
                const fullProposal = proposalData.find(p => p.id === (proposal as any).id);
                if (!fullProposal) return null;
                
                return (
                    <ProposalCard 
                        proposal={fullProposal} 
                        job={project} 
                        onHire={handleHire}
                        isContestActive={isContestActive}
                        isWinner={contest?.winnerId === fullProposal.freelancerId}
                    />
                );
            }}
            uiConfig={{
                toolbar: true,
                header: false,
                pagination: true,
                cardShell: false,
            }}
            pageTitle={t('pages.project.details.proposals.title')}
        />
    );
};

export default ProposalsView;