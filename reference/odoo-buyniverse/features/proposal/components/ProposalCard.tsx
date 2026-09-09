import React, { useMemo, useState } from 'react';
import { Proposal, Job, User, ProposalStatus, JobStatus } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';
import StarRating from '@/components/ui/StarRating';
import { Link, useNavigate } from 'react-router-dom';
import { useAppState } from '@/context/AppStateContext';

interface EnrichedProposal extends Proposal {
    freelancer: User;
    avgRating: number;
    reviewsCount: number;
}

interface ProposalCardProps {
    proposal: EnrichedProposal;
    job: Job;
    onHire: (proposalId: string, freelancerId: string, freelancerName: string, bid: number) => void;
    isContestActive?: boolean;
    isWinner?: boolean;
}

const ProposalCard: React.FC<ProposalCardProps> = ({ proposal, job, onHire, isContestActive, isWinner }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { freelancer, avgRating, reviewsCount } = proposal;
    const [isExpanded, setIsExpanded] = useState(false);
    
    const { conversations } = useAppState();

    const matchingSkills = useMemo(() => {
        if (!freelancer?.skills) return [];
        return freelancer.skills.filter(skill => job.skills.includes(skill));
    }, [freelancer, job.skills]);

    const onlineStatusColor = {
        'online': 'bg-green-500',
        'away': 'bg-yellow-500',
        'offline': 'bg-slate-400'
    }[freelancer.onlineStatus || 'offline'];
    
    const handleChat = () => {
        const convo = conversations.find(c => c.jobId === job.id && c.participants.includes(freelancer.id));
        if (convo) {
            navigate('/messages', { state: { selectedConversationId: convo.id } });
        } else {
            // This case should ideally not happen if conversations are created on proposal submission
            navigate('/messages');
        }
    }

    return (
        <Card className="flex flex-col h-full justify-between animate-fade-in-up">
            <div>
                <div className="p-4">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-start gap-3 flex-1">
                            <div className="relative shrink-0">
                                <img src={freelancer.avatarUrl} alt={freelancer.name} className="w-12 h-12 rounded-full" loading="lazy" decoding="async" />
                                <span className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ${onlineStatusColor} ring-2 ring-white dark:ring-slate-800`}></span>
                            </div>
                            <div className="flex-1">
                                <Link to={`/profile/${freelancer.id}`}><p className="font-bold text-slate-800 dark:text-slate-100 hover:text-primary-600">{freelancer.name} {isWinner && <Tag className="ml-2 bg-green-500 text-white">WINNER</Tag>}</p></Link>
                                <p className="text-xs text-slate-500 line-clamp-1">{freelancer.headline}</p>
                                <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                   <StarRating rating={avgRating} /> ({reviewsCount})
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-lg text-slate-800 dark:text-slate-100">${proposal.bid.toLocaleString()}</p>
                            <p className="text-xs text-slate-500">{t('components.proposalCard.proposedBid')}</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-center my-4 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                        <div>
                            <p className="font-bold text-primary-600 dark:text-primary-400">{freelancer.jobSuccessScore || 0}%</p>
                            <p className="text-xs text-slate-500">{t('components.proposalCard.jobSuccess')}</p>
                        </div>
                        <div>
                            <p className="font-bold text-primary-600 dark:text-primary-400">${(freelancer.totalEarned || 0).toLocaleString()}</p>
                            <p className="text-xs text-slate-500">{t('components.proposalCard.totalEarned')}</p>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-semibold text-sm mb-1">{t('components.proposalCard.coverLetter')}</h4>
                        <p className={`text-sm text-slate-600 dark:text-slate-300 ${isExpanded ? '' : 'line-clamp-3'}`}>
                            {proposal.coverLetter}
                        </p>
                        <button onClick={() => setIsExpanded(!isExpanded)} className="text-sm text-primary-600 hover:underline mt-1 font-semibold">
                            {isExpanded ? 'Show Less' : 'Show More'}
                        </button>
                    </div>

                    {matchingSkills.length > 0 && (
                        <div className="mt-4">
                            <h4 className="font-semibold text-sm mb-2">{t('components.proposalCard.matchingSkills')}</h4>
                            <div className="flex flex-wrap gap-1">
                                {matchingSkills.map(skill => <Tag key={skill} className="text-xs bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300">{skill}</Tag>)}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700/50">
                {job.status === JobStatus.Open && proposal.status === ProposalStatus.Pending && !isContestActive && (
                    <div className="flex flex-col gap-2">
                         <div className="flex items-center gap-2">
                             <Button variant="secondary" className="flex-1" onClick={handleChat}>
                                <i className="fa-regular fa-comment-dots mr-2"></i>
                                {t('components.proposalCard.chat')}
                            </Button>
                            <Button 
                                onClick={() => onHire(proposal.id, freelancer.id, freelancer.name, proposal.bid)}
                                className="flex-1"
                            >
                               <i className="fa-solid fa-check mr-2"></i>
                               {t('components.proposalCard.hire')}
                            </Button>
                        </div>
                         <Link to={`/profile/${freelancer.id}`} className="block text-center text-sm text-primary-600 hover:underline font-semibold mt-1">
                            {t('components.proposalCard.viewProfile')}
                        </Link>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default ProposalCard;