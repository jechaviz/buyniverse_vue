
import React from 'react';
import { User, Job, JobStatus, Review, Agency } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import Card from '@/components/ui/Card';
import { JobList } from '@/features/job';
import LazyOnVisible from '@/components/ui/LazyOnVisible';

interface ClientProfileProps {
    client: User;
    jobs: Job[];
    reviews: Review[];
    agencies: Agency[];
}

const ClientProfile: React.FC<ClientProfileProps> = ({ client, jobs, reviews }) => {
    const { t } = useTranslation();
    const openJobs = jobs.filter(j => j.clientId === client.id && j.status === JobStatus.Open);
    const clientReviews = reviews.filter(r => r.toUserId === client.id);

    return (
        <div className="space-y-8">
            <Card className="p-8">
                <h2 className="text-xl font-bold mb-4">{t('pages.userProfile.clientStats')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
                        <p className="text-3xl font-bold">{jobs.filter(j => j.clientId === client.id).length}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{t('pages.userProfile.jobsPosted')}</p>
                    </div>
                    <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
                        <p className="text-3xl font-bold">{openJobs.length}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{t('pages.userProfile.openJobs')}</p>
                    </div>
                    <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
                        <p className="text-3xl font-bold">{new Date(client.memberSince).getFullYear()}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{t('pages.userProfile.memberSince')}</p>
                    </div>
                </div>
            </Card>

            <div>
                <h2 className="text-2xl font-bold mb-4">{t('pages.userProfile.openJobs')} ({openJobs.length})</h2>
                {openJobs.length > 0 ? (
                    <JobList jobs={openJobs} />
                ) : (
                    <Card className="p-8 text-center text-slate-500">
                        {t('pages.userProfile.noOpenJobsClient')}
                    </Card>
                )}
            </div>

             <div>
                <h2 className="text-2xl font-bold mb-4">{t('pages.userProfile.reviewsFromFreelancers')}</h2>
                <LazyOnVisible
                    load={() => import('./WorkHistoryList')}
                    fallback={<Card className="p-8 text-center text-slate-500">Loading reviews...</Card>}
                    reviews={clientReviews}
                />
            </div>
        </div>
    );
};

export default ClientProfile;
