

import React, { useState, useMemo } from 'react';
import { useAppState } from '@/context/AppStateContext';
import { Job, JobType, ExperienceLevel, JobStatus, UserType } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Link, Navigate } from 'react-router-dom';
import { JobFilters, JobList } from '@/features/job';

const HomePage: React.FC = () => {
  const { jobs, currentUser } = useAppState();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'search' | 'saved'>('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [experienceLevels, setExperienceLevels] = useState<ExperienceLevel[]>([]);
  const [budgetMin, setBudgetMin] = useState(0);
  const [budgetMax, setBudgetMax] = useState(0);

  const openJobs = useMemo(() => jobs.filter(j => j.status === JobStatus.Open), [jobs]);
  
  const savedJobs = useMemo(() => {
    if (currentUser.type !== UserType.Freelancer) return [];
    const savedJobIds = currentUser.savedJobs || [];
    return jobs.filter(job => savedJobIds.includes(job.id));
  }, [jobs, currentUser]);

  const filterJobs = (jobsToFilter: Job[]) => {
     return jobsToFilter.filter((job: Job) => {
      const lowercasedFilter = searchTerm.toLowerCase();
      const termMatch = searchTerm === '' ||
        job.title.toLowerCase().includes(lowercasedFilter) ||
        job.description.toLowerCase().includes(lowercasedFilter) ||
        job.skills.some(skill => skill.toLowerCase().includes(lowercasedFilter));

      const typeMatch = jobTypes.length === 0 || jobTypes.includes(job.budget.type);
      const levelMatch = experienceLevels.length === 0 || experienceLevels.includes(job.experienceLevel);
      
      const minMatch = !budgetMin || job.budget.amount >= budgetMin;
      const maxMatch = !budgetMax || job.budget.amount <= budgetMax;

      return termMatch && typeMatch && levelMatch && minMatch && maxMatch;
    });
  }

  const filteredJobs = useMemo(() => filterJobs(openJobs), [openJobs, searchTerm, jobTypes, experienceLevels, budgetMin, budgetMax]);
  const filteredSavedJobs = useMemo(() => filterJobs(savedJobs), [savedJobs, searchTerm, jobTypes, experienceLevels, budgetMin, budgetMax]);

  const tabClass = (tabName: 'search' | 'saved') => 
    `py-3 px-4 text-sm font-semibold whitespace-nowrap transition-all duration-200 rounded-t-lg border-b-2 ${
      activeTab === tabName 
      ? 'border-primary-600 text-primary-600 dark:text-primary-400' 
      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
    }`;
  
  const jobsToShow = activeTab === 'search' ? filteredJobs : filteredSavedJobs;
  const noJobs = jobsToShow.length === 0;
  
  if (currentUser.type === UserType.Client || currentUser.type === UserType.Admin) {
      return <Navigate to="/dashboard" replace />;
  }

  const renderEmptyState = () => {
    if (activeTab === 'search') {
        return (
            <Card className="text-center p-12">
                <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200">{t('pages.home.noJobsFound')}</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-2">{t('pages.home.noJobsFoundDesc')}</p>
            </Card>
        );
    }
    // Saved Jobs Tab
    if (savedJobs.length === 0) {
         return (
             <Card className="text-center p-12">
                <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200">{t('pages.job.saved.empty')}</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-2">{t('pages.job.saved.emptyDesc')}</p>
                 <Link to="/"><Button variant="primary" className="mt-6" onClick={() => setActiveTab('search')}>{t('pages.job.saved.findWork')}</Button></Link>
            </Card>
        );
    }
    // Saved jobs exist, but filters hide them
    return (
        <Card className="text-center p-12">
            <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200">{t('components.filters.noSavedJobsFound')}</h2>
            <p className="text-slate-600 dark:text-slate-400 mt-2">{t('components.filters.noSavedJobsDesc')}</p>
        </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        <aside className="lg:col-span-1 lg:sticky lg:top-24">
            <JobFilters 
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                jobTypes={jobTypes}
                setJobTypes={setJobTypes}
                experienceLevels={experienceLevels}
                setExperienceLevels={setExperienceLevels}
                budgetMin={budgetMin}
                setBudgetMin={setBudgetMin}
                budgetMax={budgetMax}
                setBudgetMax={setBudgetMax}
            />
        </aside>
        
        <div className="lg:col-span-3">
            <div className="flex justify-between items-center mb-6">
                <div className="flex border-b border-slate-200 dark:border-slate-700">
                    <button onClick={() => setActiveTab('search')} className={tabClass('search')}>{t('pages.home.findWork')}</button>
                    <button onClick={() => setActiveTab('saved')} className={tabClass('saved')}>{t('layout.header.savedJobs')}</button>
                </div>
                {!noJobs && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                        {t('pages.home.jobsFound', { count: jobsToShow.length })}
                    </p>
                )}
            </div>
            {noJobs ? renderEmptyState() : <JobList jobs={jobsToShow} />}
        </div>
    </div>
  );
};

export default HomePage;
