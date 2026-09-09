
import React from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { useAppState } from '@/context/AppStateContext';
import { UserType } from '@/types';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { JobForm } from '@/features/job';
import { NotFoundPage } from '@/features/notfound';
import { useTranslation } from '@/hooks/useTranslation';

const PostJobPage: React.FC = () => {
  const { currentUser, jobs } = useAppState();
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const draftJob = jobs.find(j => j.id === id);

  if (!currentUser.permissions.canCreateProjects) {
    return (
      <Card className="max-w-xl mx-auto animate-fade-in-up">
        <div className="text-center p-12">
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{t('pages.job.post.accessDenied')}</h2>
          <p className="text-slate-600 dark:text-slate-300 mt-4 mb-8">{t('pages.job.post.accessDeniedDesc')}</p>
          <Link to="/">
            <Button>{t('pages.job.post.goToHomepage')}</Button>
          </Link>
        </div>
      </Card>
    );
  }

  if (!draftJob) {
    return <NotFoundPage />;
  }
  
  // If a freelancer somehow gets here, redirect them.
  if (currentUser.type === UserType.Freelancer) {
      return <Navigate to="/" replace />;
  }

  return (
    <div className="animate-fade-in-up">
      <JobForm draftJob={draftJob} />
    </div>
  );
};

export default PostJobPage;
