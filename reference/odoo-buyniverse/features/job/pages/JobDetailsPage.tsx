import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { UserType, JobStatus, ProposalStatus, User, Conversation, Message, NotificationType, Agency, Job, ApprovalStatus, Notification, Attachment, ProposalQualificationStatus } from '@/types';
import Tag from '@/components/ui/Tag';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { NotFoundPage } from '@/features/notfound';
import StarRating from '@/components/ui/StarRating';
import { NDAModal, QandA } from '@/features/job';
import { useTranslation } from '@/hooks/useTranslation';
import Modal from '@/components/ui/Modal';

const ApprovalControls: React.FC<{ job: Job }> = ({ job }) => {
    const { currentUser } = useAppState();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const [isRejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    const myApproval = job.approvers.find(a => a.userId === currentUser.id);

    if (!myApproval || myApproval.status !== ApprovalStatus.Pending) return null;

    // Sequential approval check
    const pendingLevels = job.approvers.filter(a => a.status === ApprovalStatus.Pending).map(a => a.level);
    const lowestPendingLevel = Math.min(...pendingLevels);
    if (myApproval.level > lowestPendingLevel) {
        return (
            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg text-center text-sm text-slate-600 dark:text-slate-300">
                {t('pages.job.details.approval.waitingForLevel', {level: lowestPendingLevel})}
            </div>
        );
    }
    
    const handleApprove = () => {
        const notification: Notification = {
            id: `notif-approved-${Date.now()}`,
            userId: job.clientId,
            type: NotificationType.JOB_APPROVED,
            text: `${currentUser.name} has approved the job: "${job.title}".`,
            link: `/client/job/${job.id}`,
            isRead: false,
            createdAt: new Date(),
        };
        dispatch({ type: 'APPROVE_JOB', payload: { jobId: job.id, approverId: currentUser.id, notification } });
    };

    const handleReject = () => {
        if (!rejectionReason.trim()) return;
         const notification: Notification = {
            id: `notif-rejected-${Date.now()}`,
            userId: job.clientId,
            type: NotificationType.JOB_REJECTED,
            text: `${currentUser.name} has rejected the job: "${job.title}".`,
            link: `/client/job/${job.id}`,
            isRead: false,
            createdAt: new Date(),
        };
        dispatch({ type: 'REJECT_JOB', payload: { jobId: job.id, approverId: currentUser.id, reason: rejectionReason, notification } });
        setRejectModalOpen(false);
    };

    return (
        <>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-500/30 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-center sm:text-left">
                    <h3 className="font-bold text-blue-800 dark:text-blue-200">{t('pages.job.details.approval.title')}</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">{t('pages.job.details.approval.description')}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                    <Button variant="danger" onClick={() => setRejectModalOpen(true)}>{t('pages.job.details.approval.reject')}</Button>
                    <Button variant="primary" onClick={handleApprove}>{t('pages.job.details.approval.approve')}</Button>
                </div>
            </div>
            <Modal isOpen={isRejectModalOpen} onClose={() => setRejectModalOpen(false)} title={t('pages.job.details.approval.rejectReasonTitle')}>
                <div className="space-y-4">
                    <Textarea label={t('pages.job.details.approval.reasonLabel')} value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} required />
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setRejectModalOpen(false)}>{t('common.cancel')}</Button>
                        <Button variant="danger" onClick={handleReject} disabled={!rejectionReason.trim()}>{t('pages.job.details.approval.reject')}</Button>
                    </div>
                </div>
            </Modal>
        </>
    )
}

const JobStatusBanner: React.FC<{ job: Job }> = ({ job }) => {
    const { t } = useTranslation();
    const { users } = useAppState();

    switch (job.status) {
        case JobStatus.PendingApproval:
            return <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm text-center">{t('pages.job.details.status.pendingApproval')}</div>;
        case JobStatus.Rejected:
            const rejectingApprover = job.approvers.find(a => a.status === ApprovalStatus.Rejected);
            const approverUser = users.find(u => u.id === rejectingApprover?.userId);
            return (
                 <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
                    <p className="font-bold text-center">{t('pages.job.details.status.rejected')}</p>
                    {rejectingApprover?.rejectionReason && (
                        <blockquote className="mt-2 p-2 border-l-4 border-red-300 dark:border-red-600 bg-red-100 dark:bg-red-800/20">
                            "{rejectingApprover.rejectionReason}"
                            <footer className="text-xs text-right mt-1"> - {approverUser?.name}</footer>
                        </blockquote>
                    )}
                </div>
            )
        case JobStatus.Cancelled:
            return <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm text-center">{t('pages.job.details.status.cancelled')}</div>;
        default:
            return null;
    }
}

const ClientInfoCard: React.FC<{ client: User; reviews: any[]; agencies: Agency[] }> = ({ client, reviews, agencies }) => {
    const { t } = useTranslation();
    const clientReviews = reviews.filter(r => r.toUserId === client.id);
    const agency = client.agencyId ? agencies.find(a => a.id === client.agencyId) : null;
    const avgRating = clientReviews.length > 0 ? clientReviews.reduce((sum, r) => sum + r.rating, 0) / clientReviews.length : 0;
    
    return (
        <Card className="p-6">
            <h3 className="text-lg font-bold mb-4">{t('pages.job.details.aboutClient')}</h3>
            <div className="flex items-center gap-4">
                 <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-bold text-primary-600">{client.name.charAt(0)}</span>
                </div>
                <div>
                    <Link to={`/profile/${client.id}`} className="font-bold text-lg hover:underline">{client.companyName || client.name}</Link>
                    <p className="text-sm text-slate-500">{client.location}</p>
                     <div className="flex items-center gap-2 text-sm mt-1">
                        <StarRating rating={avgRating} />
                        <span className="font-semibold">{avgRating.toFixed(1)}</span>
                        <span className="text-slate-500">({clientReviews.length} {t('pages.job.details.reviews', { count: clientReviews.length })})</span>
                    </div>
                </div>
            </div>
            {agency && (
                <p className="text-sm mt-2">{t('pages.job.details.partOf', { agencyName: agency.name })}</p>
            )}
             {client.isIdentityVerified && (
                <div className="flex items-center gap-2 text-sm text-green-600 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <i className="fa-solid fa-check-circle"></i>
                    <span>{t('pages.job.details.identityVerified')}</span>
                </div>
            )}
        </Card>
    );
};

const JobDetailsPage: React.FC = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const { jobs, users, currentUser, reviews, agencies } = useAppState();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();

    const [bid, setBid] = useState(0);
    const [coverLetter, setCoverLetter] = useState('');
    const [completionTime, setCompletionTime] = useState('');
    const [isNdaModalOpen, setNdaModalOpen] = useState(false);
    const [ndaSigned, setNdaSigned] = useState(false);

    const job = useMemo(() => jobs.find(j => j.id === jobId), [jobs, jobId]);
    const client = useMemo(() => users.find(u => u.id === job?.clientId), [users, job]);

    const myProposal = useMemo(() => {
        return job?.proposals.find(p => p.freelancerId === currentUser.id);
    }, [job, currentUser.id]);

    const canSubmitProposal = 
        currentUser.type === UserType.Freelancer &&
        job?.status === JobStatus.Open &&
        !myProposal &&
        (!job.requiresNDA || ndaSigned);

    if (!job || !client) {
        return <NotFoundPage />;
    }

    const handleSubmitProposal = (e: React.FormEvent) => {
        e.preventDefault();
        const conversationId = `convo-${currentUser.id}-${job.id}`;
        const newProposal = {
            id: `prop-${Date.now()}`,
            jobId: job.id,
            freelancerId: currentUser.id,
            freelancerName: currentUser.name,
            bid: job.budget.type === 'Hourly' ? bid : job.budget.amount,
            coverLetter,
            submittedAt: new Date(),
            status: ProposalStatus.Pending,
            qualificationStatus: ProposalQualificationStatus.Pending,
            ndaSigned: ndaSigned,
            completionTime,
            attachments: [] as Attachment[],
        };
        const newConversation: Conversation = {
            id: conversationId,
            participants: [currentUser.id, job.clientId],
            jobId: job.id,
            messages: [{
                id: `msg-${Date.now()}`,
                senderId: currentUser.id,
                text: coverLetter,
                timestamp: new Date(),
            }],
        };
        const notification: Notification = {
            id: `notif-${Date.now()}`,
            userId: job.clientId,
            type: NotificationType.PROPOSAL_RECEIVED,
            text: `${currentUser.name} submitted a proposal for your job "${job.title}".`,
            link: `/client/job/${job.id}`,
            isRead: false,
            createdAt: new Date(),
        };
        dispatch({ type: 'ADD_PROPOSAL', payload: { proposal: newProposal, conversation: newConversation, notification } });
    };
    
    const isSaved = currentUser.savedJobs?.includes(job.id);
    const handleToggleSave = () => dispatch({ type: 'TOGGLE_SAVE_JOB', payload: { jobId: job.id } });

    return (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <main className="lg:col-span-2 space-y-8">
                <Card className="p-8">
                    <JobStatusBanner job={job} />
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-4">{job.title}</h1>
                    <p className="text-sm text-slate-500 mt-2">{t('pages.job.card.postedOn', { date: new Date(job.postedAt).toLocaleDateString() })}</p>
                    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-bold mb-2">{t('pages.job.details.jobDetails')}</h2>
                        <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{job.description}</p>
                    </div>
                    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                         <h3 className="text-xl font-bold mb-4">{t('pages.job.details.skillsRequired')}</h3>
                         <div className="flex flex-wrap gap-2">
                            {job.skills.map(skill => <Tag key={skill}>{skill}</Tag>)}
                        </div>
                    </div>
                </Card>
                <ApprovalControls job={job} />
                <Card className="p-8">
                    <h2 className="text-xl font-bold mb-4">{t('pages.job.details.qanda', { count: job.questions.length })}</h2>
                    <QandA job={job} />
                </Card>
            </main>
            <aside className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
                 <ClientInfoCard client={client} reviews={reviews} agencies={agencies} />
                <Card className="p-6">
                    <h3 className="text-lg font-bold mb-4">{t('pages.job.details.jobInfo.title')}</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between"><span>{t('pages.job.details.jobInfo.budget')}:</span> <span className="font-semibold">${job.budget.amount.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>{t('pages.job.details.jobInfo.jobType')}:</span> <span className="font-semibold">{t(`shared.jobTypes.${job.budget.type.toLowerCase().replace('-', '_')}`)}</span></div>
                        <div className="flex justify-between"><span>{t('pages.job.details.jobInfo.experience')}:</span> <span className="font-semibold">{t(`shared.experienceLevels.${job.experienceLevel.toLowerCase()}`)}</span></div>
                        {job.requiresNDA && <div className="flex justify-between"><span>{t('pages.job.details.jobInfo.ndaRequired')}:</span> <span className="font-semibold text-red-500">Yes</span></div>}
                    </div>
                    {currentUser.type === UserType.Freelancer && (
                        <Button variant="secondary" className="w-full mt-6" onClick={handleToggleSave}>
                            <i className={`fa-bookmark mr-2 ${isSaved ? 'fa-solid' : 'fa-regular'}`}></i> {isSaved ? t('pages.job.details.jobSaved') : t('pages.job.details.saveJob')}
                        </Button>
                    )}
                    {currentUser.type === UserType.Client && currentUser.id === job.clientId && (
                        <Link to={`/client/job/${job.id}`} className="block mt-6"><Button className="w-full">{t('pages.job.details.manageJob')}</Button></Link>
                    )}
                </Card>
                {canSubmitProposal && (
                     <Card className="p-6">
                         <h3 className="text-lg font-bold mb-4">{t('pages.job.details.submitProposal')}</h3>
                         <form onSubmit={handleSubmitProposal} className="space-y-4">
                             {job.budget.type === 'Hourly' && <Input label={t('pages.job.details.yourHourlyRate')} type="number" value={bid} onChange={e => setBid(Number(e.target.value))} required />}
                             <Textarea label={t('pages.job.details.coverLetter')} value={coverLetter} onChange={e => setCoverLetter(e.target.value)} placeholder={t('pages.job.details.coverLetterPlaceholder')} required />
                             <Input label={t('pages.job.details.completionTime')} value={completionTime} onChange={e => setCompletionTime(e.target.value)} placeholder={t('pages.job.details.completionTimePlaceholder')} required />
                             <Button type="submit" className="w-full">{t('pages.job.details.submitButton')}</Button>
                         </form>
                     </Card>
                )}
                {job.requiresNDA && !ndaSigned && currentUser.type === UserType.Freelancer && (
                    <Card className="p-6 text-center">
                        <p className="font-semibold">{t('pages.job.details.ndaRequired')}</p>
                        <p className="text-sm text-slate-600 mb-4">{t('pages.job.details.ndaDesc')}</p>
                        <Button onClick={() => setNdaModalOpen(true)}>{t('pages.job.details.viewAndSignNda')}</Button>
                    </Card>
                )}
                {myProposal && (
                    <Card className="p-6 text-center">
                        <h3 className="text-lg font-bold mb-2">{t('pages.job.details.proposalSubmitted')}</h3>
                        <p className="text-sm text-slate-600 mb-4">{t('pages.job.details.proposalSubmittedDesc')}</p>
                        <Link to="/dashboard"><Button>{t('pages.job.details.goToDashboard')}</Button></Link>
                    </Card>
                )}
            </aside>
        </div>
        <NDAModal isOpen={isNdaModalOpen} onClose={() => setNdaModalOpen(false)} onAgree={() => { setNdaSigned(true); setNdaModalOpen(false); }} />
        </>
    );
};

export default JobDetailsPage;
