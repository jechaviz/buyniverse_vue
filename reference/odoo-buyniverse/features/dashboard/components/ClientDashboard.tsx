import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import * as ReactRouterDOM from 'react-router-dom';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatCard from '@/components/ui/StatCard';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { Job, JobStatus, SourcingType, ProjectLevel, Duration, Contract, MilestoneStatus, User, Agency, JobType, ExperienceLevel } from '@/types';
import ProgressBar from '@/components/ui/ProgressBar';

const { Link, useNavigate } = ReactRouterDOM;

const JobPostings: React.FC<{ jobs: Job[] }> = ({ jobs }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = React.useState<JobStatus>(JobStatus.Open);
    
    const tabs = [JobStatus.Open, JobStatus.InProgress, JobStatus.PendingApproval, JobStatus.Draft, JobStatus.Completed, JobStatus.Archived];
    const jobsInTab = jobs.filter(j => j.status === activeTab);

    return (
        <Card>
            <div className="p-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('pages.dashboard.client.jobPostings')}</h2>
            </div>
             <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="flex -mb-px px-6 space-x-4 overflow-x-auto">
                    {tabs.map(tab => (
                        <button 
                            key={tab} 
                            onClick={() => setActiveTab(tab)}
                            className={`px-1 pb-3 text-sm font-semibold whitespace-nowrap transition-all duration-200 border-b-2 ${activeTab === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:border-primary-500/50 hover:text-slate-700'}`}
                        >
                            {t(`pages.project.list.${tab.toLowerCase().replace('_', '')}`, {defaultValue: tab})}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="p-6">
                 {jobsInTab.length > 0 ? (
                    <ul className="space-y-4">
                        {jobsInTab.map(job => (
                             <li key={job.id} className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                                 <div>
                                    <Link to={`/project/${job.id}`} className="font-semibold hover:underline">{job.title}</Link>
                                    <p className="text-xs text-slate-500">{job.proposals.length} proposals</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {job.contestId && <Link to={`/project/${job.id}/contest`}><Button size="sm" variant="outline">{job.status === JobStatus.InProgress ? t('pages.dashboard.client.viewResults') : t('pages.dashboard.client.viewContest')}</Button></Link>}
                                    <Link to={`/project/${job.id}`}><Button size="sm">{t('pages.dashboard.client.manageJob')}</Button></Link>
                                </div>
                            </li>
                        ))}
                    </ul>
                 ) : (
                    <p className="text-center text-slate-500">{t('pages.dashboard.client.noJobsInStatus', {status: activeTab})}</p>
                 )}
            </div>
        </Card>
    );
};


const ActiveContracts: React.FC<{ contracts: Contract[] }> = ({ contracts }) => {
    const { t } = useTranslation();
    const { jobs, users, agencies } = useAppState();

    return (
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">{t('pages.dashboard.client.activeContracts')}</h2>
            {contracts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {contracts.map(contract => {
                        const job = jobs.find(j => j.id === contract.sourceId);
                        const provider = users.find(u => u.id === contract.providerId) || agencies.find(a => a.id === contract.providerId);
                        if (!job || !provider) return null;

                        const paid = contract.milestones.filter(m => m.status === MilestoneStatus.Released).reduce((sum, m) => sum + m.amount, 0);
                        const progress = contract.milestones.length > 0 ? (contract.milestones.filter(m => m.status === MilestoneStatus.Released).length / contract.milestones.length) * 100 : 0;
                        
                        return (
                            <Card key={contract.id} className="p-5">
                                <Link to={`/contract/${contract.id}`}>
                                    <p className="font-bold hover:underline">{job.title}</p>
                                    <p className="text-sm text-slate-500 mb-4">{t('pages.dashboard.client.workingWith', { name: provider.name })}</p>
                                </Link>
                                <div className="space-y-3 text-sm">
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <span>{t('pages.dashboard.progress')}</span>
                                            <span>{Math.round(progress)}%</span>
                                        </div>
                                        <ProgressBar progress={progress} />
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">{t('pages.dashboard.paid')}</span>
                                        <span className="font-semibold">${paid.toLocaleString()} / ${contract.rateOrBid.toLocaleString()}</span>
                                    </div>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            ) : (
                 <Card className="p-8 text-center text-slate-500">
                    <p>{t('pages.dashboard.client.noActiveContracts')}</p>
                </Card>
            )}
        </div>
    )
}

const ClientDashboard: React.FC = () => {
    const { t } = useTranslation();
    const { jobs, contracts, currentUser, contests } = useAppState();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const myJobs = jobs.filter(j => j.clientId === currentUser.id);
    const myActiveContracts = contracts.filter(c => c.clientId === currentUser.id && !c.endedAt);
    const myContests = contests.filter(c => myJobs.some(j => j.id === c.jobId));
    
    // Calculate benefit stats
    const potentialSavings = myContests.reduce((total, contest) => {
        const bids = contest.bidHistory.map(b => b.amount);
        if (bids.length < 2) return total;
        return total + (Math.max(...bids) - Math.min(...bids));
    }, 0);
    const competitiveBids = myJobs.reduce((total, job) => total + job.proposals.length, 0);
    
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

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                 <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{t('pages.dashboard.client.title')}</h1>
                 <div className="flex gap-2">
                    <Link to="/find-talent"><Button variant="outline">{t('pages.dashboard.client.findTalent')}</Button></Link>
                    <Button onClick={handleCreateJobDraft}>{t('pages.dashboard.client.postJob')}</Button>
                 </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon="fa-sack-dollar" title={t('pages.dashboard.benefits.potentialSavings')} value={`$${potentialSavings.toLocaleString()}`} description={t('pages.dashboard.benefits.potentialSavingsDesc')} colorClass="bg-stat-green" />
                <StatCard icon="fa-users" title={t('pages.dashboard.benefits.competitiveBids')} value={competitiveBids.toString()} description={t('pages.dashboard.benefits.competitiveBidsDesc')} colorClass="bg-stat-blue" />
                <StatCard icon="fa-clock" title={t('pages.dashboard.benefits.timeToHire')} value="12 Days" description={t('pages.dashboard.benefits.timeToHireDesc')} colorClass="bg-stat-orange" />
                <StatCard icon="fa-star" title={t('pages.dashboard.benefits.topTalent')} value="25" description={t('pages.dashboard.benefits.topTalentDesc')} colorClass="bg-stat-red" />
            </div>
            
            <ActiveContracts contracts={myActiveContracts} />

            <JobPostings jobs={myJobs} />
        </div>
    );
};

export default ClientDashboard;