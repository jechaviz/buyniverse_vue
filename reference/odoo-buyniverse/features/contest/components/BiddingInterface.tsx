import React, { useState, useMemo } from 'react';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { Contest, Job, UserType, Message, NotificationType, Notification, Contract, ContractType, Proposal } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useTranslation } from '@/hooks/useTranslation';
import Tag from '@/components/ui/Tag';

interface BiddingInterfaceProps {
    contest: Contest;
    job: Job;
}

const BiddingInterface: React.FC<BiddingInterfaceProps> = ({ contest, job }) => {
    const { currentUser, users } = useAppState();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const [newBid, setNewBid] = useState('');
    const [error, setError] = useState('');
    
    const isClientOwner = currentUser.id === job.clientId;
    
    const myProposal = useMemo(() => {
        return job.proposals.find(p => p.freelancerId === currentUser.id);
    }, [job, currentUser.id]);

    const sortedProposals = useMemo(() => {
        return [...job.proposals].sort((a, b) => a.bid - b.bid);
    }, [job.proposals]);

    const handleSelectWinner = (proposal: Proposal) => {
        if (!proposal) return;
        
        const contract: Contract = {
            id: `contract-${job.id}`,
            type: ContractType.Job,
            jobType: job.budget.type,
            sourceId: job.id,
            clientId: job.clientId,
            providerId: proposal.freelancerId,
            rateOrBid: proposal.bid,
            startedAt: new Date(),
            milestones: [],
        };

        const notifications: Notification[] = job.proposals.map(p => ({
            id: `notif-contest-winner-${p.freelancerId}`,
            userId: p.freelancerId,
            type: NotificationType.CONTEST_WINNER_SELECTED,
            text: p.id === proposal.id 
                ? `Congratulations! You won the contest for "${job.title}". A contract has been created.`
                : `The contest for "${job.title}" has concluded. The client has selected a winner.`,
            link: p.id === proposal.id ? `/contract/${contract.id}` : `/job/${job.id}`,
            isRead: false,
            createdAt: new Date(),
        }));

        dispatch({
            type: 'SELECT_CONTEST_WINNER',
            payload: {
                contestId: contest.id,
                jobId: job.id,
                winnerId: proposal.freelancerId,
                contract,
                notifications,
            }
        });
    };

    const handleSubmitBid = () => {
        const bidAmount = parseFloat(newBid);
        if (isNaN(bidAmount) || !myProposal) {
            return;
        }
        if (bidAmount >= myProposal.bid) {
            setError(t('pages.contest.bidTooHigh'));
            return;
        }

        setError('');

        const message: Message = {
            id: `msg-bid-${Date.now()}`,
            senderId: currentUser.id,
            text: `I've placed a new bid of $${bidAmount.toLocaleString()}`,
            timestamp: new Date()
        };

        const notificationForClient: Notification = {
            id: `notif-bid-${Date.now()}`,
            userId: job.clientId,
            type: NotificationType.NEW_BID_PLACED,
            text: `${currentUser.name} placed a new bid on "${job.title}".`,
            link: `/project/${job.id}/contest`,
            isRead: false,
            createdAt: new Date(),
        };

        dispatch({ type: 'UPDATE_PROPOSAL_BID', payload: { jobId: job.id, proposalId: myProposal.id, newBid: bidAmount, message, notification: notificationForClient } });
        setNewBid('');
    };

    if (isClientOwner) {
        if (contest.status === 'FINISHED' && !contest.winnerId) {
             return (
                <div>
                    <h3 className="font-semibold mb-2">{t('pages.contest.currentBids')}</h3>
                    <ul className="space-y-2">
                        {sortedProposals.map(proposal => {
                            const freelancer = users.find(u => u.id === proposal.freelancerId);
                            return (
                                <li key={proposal.id} className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                                    <span className="font-semibold">{freelancer?.name || t('pages.contest.anonymous')}</span>
                                    <div className="flex items-center gap-4">
                                        <span className="font-bold text-lg text-primary-600 dark:text-primary-400">${proposal.bid.toLocaleString()}</span>
                                        <Button size="sm" onClick={() => handleSelectWinner(proposal)}>{t('pages.contest.selectWinner')}</Button>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            )
        }

        return (
            <div>
                <h3 className="font-semibold mb-2">{t('pages.contest.currentBids')}</h3>
                <ul className="space-y-2">
                    {sortedProposals.map(proposal => {
                        const freelancer = users.find(u => u.id === proposal.freelancerId);
                        const isWinner = contest.winnerId === proposal.freelancerId;
                        return (
                             <li key={proposal.id} className={`flex justify-between items-center p-3 rounded-lg transition-colors ${isWinner ? 'bg-green-100 dark:bg-green-900/30' : 'bg-slate-50 dark:bg-slate-800'}`}>
                                <div className="flex items-center gap-3">
                                    <span className="font-semibold">{contest.showParticipantNames ? (freelancer?.name || t('pages.contest.anonymous')) : t('pages.contest.anonymous')}</span>
                                    {isWinner && <Tag className="bg-green-500 text-white">{t('pages.contest.winner')}</Tag>}
                                </div>
                                <span className="font-bold text-lg text-primary-600 dark:text-primary-400">{contest.showParticipantOffers ? `$${proposal.bid.toLocaleString()}` : '****'}</span>
                            </li>
                        )
                    })}
                </ul>
            </div>
        )
    }

    if (!myProposal) return null;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-baseline p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <span className="font-semibold">{t('pages.contest.yourBid')}:</span>
                <span className="font-bold text-2xl">${myProposal.bid.toLocaleString()}</span>
            </div>
            <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">{t('pages.contest.newBid')}</h4>
                <div className="flex gap-2 items-start">
                    <Input
                        type="number"
                        placeholder={t('pages.contest.bidPlaceholder')}
                        value={newBid}
                        onChange={e => { setNewBid(e.target.value); setError(''); }}
                        wrapperClassName="flex-grow"
                    />
                    <Button onClick={handleSubmitBid}>{t('pages.contest.submitBid')}</Button>
                </div>
                {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
            </div>
        </div>
    );
};

export default BiddingInterface;