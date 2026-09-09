
import React, { useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAppState } from '@/context/AppStateContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ProposalStatus, Proposal, Job, JobStatus, User, Contract, ContractType, Gig, MilestoneStatus } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import ProgressBar from '@/components/ui/ProgressBar';

const { Link } = ReactRouterDOM;

const StatCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700 text-center shadow-sm">
        <p className="text-3xl font-bold text-primary-600">{value}</p>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
    </div>
);

const ActiveContracts: React.FC<{ contracts: Contract[] }> = ({ contracts }) => {
    const { t } = useTranslation();
    const { jobs, users, agencies, gigs } = useAppState();

    const getSourceForContract = (contract: Contract): Job | Gig | undefined => {
        return contract.type === ContractType.Job ? 
            jobs.find(j => j.id === contract.sourceId) : 
            gigs.find(g => g.id === contract.sourceId);
    }

    return (
        <section>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">{t('pages.dashboard.freelancer.activeContracts')}</h2>
            {contracts.length > 0 ? (
                 <div className="space-y-4">
                    {contracts.map(contract => {
                        const source = getSourceForContract(contract);
                        const client = users.find(u => u.id === contract.clientId);
                        if (!source || !client) return null;

                        const progress = contract.milestones.length > 0 ? (contract.milestones.filter(m => m.status === MilestoneStatus.Released).length / contract.milestones.length) * 100 : 0;
                        const nextMilestone = contract.milestones
                            .filter(m => m.status === MilestoneStatus.Funded || m.status === MilestoneStatus.Pending)
                            .sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

                        return (
                             <Card key={contract.id} className="p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <Link to={`/contract/${contract.id}`} className="font-semibold hover:underline">{source.title}</Link>
                                        <p className="text-sm text-slate-500">{t('pages.dashboard.freelancer.client', {name: client.name})}</p>
                                    </div>
                                    <Link to={`/contract/${contract.id}`}><Button size="sm" variant="outline">{t('pages.dashboard.freelancer.viewContract')}</Button></Link>
                                </div>
                                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2">
                                     <div>
                                        <div className="flex justify-between mb-1 text-sm">
                                            <span>{t('pages.dashboard.progress')}</span>
                                            <span>{Math.round(progress)}%</span>
                                        </div>
                                        <ProgressBar progress={progress} />
                                    </div>
                                    {nextMilestone && (
                                         <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">{t('pages.dashboard.nextMilestone')}</span>
                                            <span className="font-semibold">{new Date(nextMilestone.dueDate).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        )
                    })}
                </div>
            ) : (
                <Card className="p-8 text-center text-slate-500">
                    <p>{t('pages.dashboard.freelancer.noActiveContracts')}</p>
                </Card>
            )}
        </section>
    );
};


export const FreelancerDashboard: React.FC = () => {
  const { jobs, currentUser, contracts, users, conversations, gigs } = useAppState();
  const { t } = useTranslation();
  
  const myProposals = useMemo(() => {
    return jobs
        .flatMap(job => job.proposals.map(proposal => ({ proposal, job })))
        .filter(({ proposal }) => proposal.freelancerId === currentUser.id)
        .sort((a, b) => b.proposal.submittedAt.getTime() - a.proposal.submittedAt.getTime());
  }, [jobs, currentUser.id]);
  
  const myContracts = contracts.filter(c => (c.providerId === currentUser.id || (!!currentUser.agencyId && c.providerId === currentUser.agencyId)) && !c.endedAt);
  const hourlyContracts = myContracts.filter(c => c.jobType === 'Hourly').length > 0;
  const pendingProposals = myProposals.filter(p => p.proposal.status === ProposalStatus.Pending);
  const myTotalCompletedJobs = contracts.filter(c => (c.providerId === currentUser.id || (!!currentUser.agencyId && c.providerId === currentUser.agencyId)) && c.endedAt).length;

  const myInvitations = useMemo(() => {
    const appliedJobIds = new Set(myProposals.map(p => p.job.id));
    return jobs.filter(j => 
        j.invitedFreelancerIds?.includes(currentUser.id) && 
        !appliedJobIds.has(j.id) && 
        j.status === JobStatus.Open
    );
  }, [jobs, currentUser.id, myProposals]);


  const stats = {
      activeContracts: myContracts.length,
      pendingApplications: pendingProposals.length,
      completedJobs: myTotalCompletedJobs,
  };

  const getOtherParticipant = (participants: string[], currentUserId: string): User | undefined => {
    const otherId = participants.find(p => p !== currentUserId);
    return users.find(u => u.id === otherId);
  }

  const recentMessages = useMemo(() => {
    return conversations
        .filter(c => c.participants.includes(currentUser.id))
        .sort((a,b) => b.messages[b.messages.length - 1].timestamp.getTime() - a.messages[a.messages.length - 1].timestamp.getTime())
        .slice(0, 3);
  }, [conversations, currentUser.id]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{t('pages.dashboard.freelancer.title')}</h1>
        {hourlyContracts && (
            <Link to="/dashboard/timesheets">
                <Button variant="outline">{t('pages.dashboard.freelancer.myTimesheets')}</Button>
            </Link>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label={t('pages.dashboard.freelancer.stats.activeContracts')} value={stats.activeContracts} />
          <StatCard label={t('pages.dashboard.freelancer.stats.pendingApplications')} value={stats.pendingApplications} />
          <StatCard label={t('pages.dashboard.freelancer.stats.completedJobs')} value={stats.completedJobs} />
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
            <ActiveContracts contracts={myContracts} />

            <section>
                 <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">{t('pages.dashboard.freelancer.jobInvitations')}</h2>
                 {myInvitations.length > 0 ? (
                    <Card className="overflow-hidden">
                        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                           {myInvitations.map((job) => {
                               const client = users.find(u => u.id === job.clientId);
                               return (
                                <li key={job.id} className="p-4 flex flex-wrap justify-between items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <div>
                                        <Link to={`/job/${job.id}`} className="font-semibold hover:underline">{job.title}</Link>
                                        <p className="text-sm text-slate-500">{t('pages.dashboard.freelancer.client', {name: client?.name})}</p>
                                    </div>
                                    <Link to={`/job/${job.id}`}><Button size="sm">{t('pages.dashboard.freelancer.viewJob')}</Button></Link>
                                </li>
                               );
                           })}
                        </ul>
                    </Card>
                 ) : (
                    <Card className="p-8 text-center text-slate-500">
                        <p>{t('pages.dashboard.freelancer.noJobInvitations')}</p>
                    </Card>
                 )}
            </section>
            <section>
                 <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">{t('pages.dashboard.freelancer.myProposals', {count: pendingProposals.length})}</h2>
                 {pendingProposals.length > 0 ? (
                    <Card className="overflow-hidden">
                        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                           {pendingProposals.map(({ proposal, job }) => (
                               <li key={proposal.id} className="p-4 flex flex-wrap justify-between items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <div>
                                        <Link to={`/job/${job.id}`} className="font-semibold hover:underline">{job.title}</Link>
                                        <p className="text-sm text-slate-500">{t('pages.dashboard.freelancer.submittedOn', { date: new Date(proposal.submittedAt).toLocaleDateString(), bid: proposal.bid})}</p>
                                    </div>
                                    <Link to={`/job/${job.id}`}><Button size="sm" variant="outline">{t('pages.dashboard.freelancer.viewJob')}</Button></Link>
                               </li>
                           ))}
                        </ul>
                    </Card>
                 ) : (
                     <Card className="p-8 text-center text-slate-500">
                        <p>{t('pages.dashboard.freelancer.noPendingProposals')}</p>
                    </Card>
                 )}
            </section>
        </div>
        <aside className="lg:col-span-1 space-y-8">
            <section>
                 <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">{t('pages.dashboard.recentMessages')}</h2>
                 {recentMessages.length > 0 ? (
                     <Card className="p-4 space-y-2">
                         {recentMessages.map(convo => {
                            const otherUser = getOtherParticipant(convo.participants, currentUser.id);
                            const lastMessage = convo.messages[convo.messages.length-1];
                            return (
                                <Link to="/messages" key={convo.id} className="block p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                                    <p className="font-semibold text-sm">{otherUser?.name}</p>
                                    <p className="text-xs text-slate-500 truncate">{lastMessage.senderId === currentUser.id ? t('pages.dashboard.you') : ''}{lastMessage.text}</p>
                                </Link>
                            )
                         })}
                     </Card>
                 ) : (
                     <Card className="p-8 text-center text-slate-500">
                         <p>{t('pages.dashboard.noRecentMessages')}</p>
                     </Card>
                 )}
            </section>
        </aside>
    </div>
  );
};