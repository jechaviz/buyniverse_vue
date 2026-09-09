import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAppState } from '@/context/AppStateContext';
import { NotFoundPage } from '@/features/notfound';
import Card from '@/components/ui/Card';
import { ContestStatus, UserType } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { ContestChat, BiddingInterface, BiddingChart } from '@/features/contest';

const { useParams } = ReactRouterDOM;

const CountdownTimer: React.FC<{ endTime: Date; onFinish: () => void }> = ({ endTime, onFinish }) => {
    const [timeLeft, setTimeLeft] = useState(endTime.getTime() - Date.now());

    useEffect(() => {
        const timer = setInterval(() => {
            const newTimeLeft = endTime.getTime() - Date.now();
            if (newTimeLeft <= 0) {
                clearInterval(timer);
                setTimeLeft(0);
                onFinish();
            } else {
                setTimeLeft(newTimeLeft);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [endTime, onFinish]);

    const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
    const seconds = Math.floor((timeLeft / 1000) % 60);

    return (
        <span className="font-mono text-2xl font-bold tracking-widest">
            {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </span>
    );
};

const LiveContestPage: React.FC = () => {
    const { id: jobId } = useParams<{ id: string }>();
    const { jobs, contests, currentUser, users } = useAppState();
    const { t } = useTranslation();

    const job = jobs.find(j => j.id === jobId);
    const contest = contests.find(c => c.jobId === jobId);

    const [isFinished, setIsFinished] = useState(contest?.status === ContestStatus.Finished);

    if (!job || !contest) {
        return <NotFoundPage />;
    }

    const isParticipant = job.proposals.some(p => p.freelancerId === currentUser.id);
    const isClientOwner = job.clientId === currentUser.id;

    if (!isParticipant && !isClientOwner) {
        return <NotFoundPage />; // Or an access denied page
    }

    const handleContestFinish = () => {
        // In a real app, this would dispatch an action to update the contest status
        setIsFinished(true);
        // For mock, we'll just update local state
        contest.status = ContestStatus.Finished; 
    };
    
    const participants = job.proposals.map(p => users.find(u => u.id === p.freelancerId)).filter(Boolean);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-8">
                <Card className="p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm uppercase text-primary-500 font-semibold">{t('pages.contest.liveContest')}</p>
                            <h1 className="text-2xl font-bold">{job.title}</h1>
                        </div>
                        <div className="text-center p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <p className="text-xs uppercase font-semibold text-slate-500">{t('pages.contest.timeRemaining')}</p>
                            {contest.status === ContestStatus.Active && !isFinished ? (
                                <CountdownTimer endTime={contest.endTime} onFinish={handleContestFinish} />
                            ) : (
                                <span className="font-mono text-2xl font-bold tracking-widest">00:00</span>
                            )}
                        </div>
                    </div>
                </Card>
                
                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4">{t('pages.contest.biddingChart')}</h2>
                    <BiddingChart bidHistory={contest.bidHistory} participants={participants} startTime={contest.startTime} endTime={contest.endTime} />
                </Card>

                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4">{t('pages.contest.bidding')}</h2>
                    {contest.status === ContestStatus.Active && !isFinished ? (
                        <BiddingInterface contest={contest} job={job} />
                    ) : (
                        <div className="text-center py-10 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                            <h3 className="text-2xl font-bold text-primary-700 dark:text-primary-300">{t('pages.contest.contestEnded')}</h3>
                            <p className="text-slate-600 dark:text-slate-300 mt-2">{t('pages.contest.clientReviewing')}</p>
                        </div>
                    )}
                </Card>
            </div>
            <div className="lg:col-span-1 lg:sticky lg:top-24">
                <Card className="h-[70vh] flex flex-col">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="font-bold text-lg">{t('pages.contest.chat')}</h2>
                    </div>
                    <ContestChat conversationId={contest.conversationId} />
                </Card>
            </div>
        </div>
    );
};

export default LiveContestPage;