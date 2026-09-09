

import React, { useState, useMemo } from 'react';
import { useAppState } from '@/context/AppStateContext';
import { Job, JobType, ExperienceLevel, UserType } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { JobFilters, JobList } from '@/features/job';
import { Link, Navigate } from 'react-router-dom';

const SavedJobsPage: React.FC = () => {
    const { jobs, currentUser } = useAppState();
    const { t } = useTranslation();

    const [searchTerm, setSearchTerm] = useState('');
    const [jobTypes, setJobTypes] = useState<JobType[]>([]);
    const [experienceLevels, setExperienceLevels] = useState<ExperienceLevel[]>([]);
    const [budgetMin, setBudgetMin] = useState(0);
    const [budgetMax, setBudgetMax] = useState(0);
    
    if (currentUser.type !== UserType.Freelancer) {
        return <Navigate to="/dashboard" replace />;
    }

    const savedJobs = useMemo(() => {
        const savedJobIds = currentUser.savedJobs || [];
        return jobs.filter(job => savedJobIds.includes(job.id));
    }, [jobs, currentUser]);

    const filteredSavedJobs = useMemo(() => {
        return savedJobs.filter((job: Job) => {
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
    }, [savedJobs, searchTerm, jobTypes, experienceLevels, budgetMin, budgetMax]);

    const renderContent = () => {
        if (savedJobs.length === 0) {
            return (
                 <Card className="text-center p-12 lg:col-span-3">
                    <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200">{t('pages.job.saved.empty')}</h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-2">{t('pages.job.saved.emptyDesc')}</p>
                    <Link to="/"><Button variant="primary" className="mt-6">{t('pages.job.saved.findWork')}</Button></Link>
                </Card>
            );
        }
        if (filteredSavedJobs.length === 0) {
            return (
                <Card className="text-center p-12 lg:col-span-3">
                    <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200">{t('components.filters.noSavedJobsFound')}</h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-2">{t('components.filters.noSavedJobsDesc')}</p>
                </Card>
            );
        }
        return <JobList jobs={filteredSavedJobs} />;
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">{t('pages.job.saved.title')}</h1>
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
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default SavedJobsPage;
