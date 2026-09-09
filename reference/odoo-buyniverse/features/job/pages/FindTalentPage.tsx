
import React, { useState, useMemo } from 'react';
import { useAppState } from '@/context/AppStateContext';
import { useTranslation } from '@/hooks/useTranslation';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { FreelancerCard } from '@/features/freelancer';
import { AgencyCard } from '@/features/agency';
import { UserType } from '@/types';

const FindTalentPage: React.FC = () => {
    const { users, agencies } = useAppState();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'freelancers' | 'agencies'>('freelancers');
    const [searchTerm, setSearchTerm] = useState('');

    const freelancers = useMemo(() => {
        return users.filter(u => u.type === UserType.Freelancer);
    }, [users]);
    
    const filteredFreelancers = useMemo(() => {
        if (!searchTerm) return freelancers;
        const lowercasedFilter = searchTerm.toLowerCase();
        return freelancers.filter(f =>
            f.name.toLowerCase().includes(lowercasedFilter) ||
            f.headline?.toLowerCase().includes(lowercasedFilter) ||
            f.skills?.some(s => s.toLowerCase().includes(lowercasedFilter))
        );
    }, [freelancers, searchTerm]);
    
    const filteredAgencies = useMemo(() => {
        if (!searchTerm) return agencies;
        const lowercasedFilter = searchTerm.toLowerCase();
        return agencies.filter(a =>
            a.name.toLowerCase().includes(lowercasedFilter) ||
            a.tagline.toLowerCase().includes(lowercasedFilter) ||
            a.specialties?.some(s => s.toLowerCase().includes(lowercasedFilter))
        );
    }, [agencies, searchTerm]);

    const tabClass = (tabName: 'freelancers' | 'agencies') => 
        `py-3 px-4 text-sm font-semibold whitespace-nowrap transition-all duration-200 rounded-t-lg border-b-2 ${
            activeTab === tabName 
            ? 'border-primary-600 text-primary-600 dark:text-primary-400' 
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
        }`;
    
    const searchPlaceholder = activeTab === 'freelancers' 
        ? t('pages.findTalent.searchPlaceholderFreelancer') 
        : t('pages.findTalent.searchPlaceholderAgency');

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{t('pages.findTalent.title')}</h1>
                <p className="text-lg text-slate-600 dark:text-slate-300 mt-2">{t('pages.findTalent.description')}</p>
            </div>

            <Card className="p-4">
                <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4">
                    <button onClick={() => setActiveTab('freelancers')} className={tabClass('freelancers')}>{t('pages.findTalent.freelancers')}</button>
                    <button onClick={() => setActiveTab('agencies')} className={tabClass('agencies')}>{t('pages.findTalent.agencies')}</button>
                </div>
                <Input
                    placeholder={searchPlaceholder}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </Card>
            
            {activeTab === 'freelancers' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredFreelancers.map(freelancer => (
                            <FreelancerCard key={freelancer.id} freelancer={freelancer} />
                        ))}
                    </div>
                    {filteredFreelancers.length === 0 && (
                        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                            <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200">{t('pages.findTalent.noFreelancersFound')}</h3>
                            <p className="text-slate-500 dark:text-slate-400 mt-2">{t('pages.findTalent.tryAdjusting')}</p>
                        </div>
                    )}
                </>
            )}

            {activeTab === 'agencies' && (
                 <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredAgencies.map(agency => (
                            <AgencyCard key={agency.id} agency={agency} />
                        ))}
                    </div>
                    {filteredAgencies.length === 0 && (
                        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                            <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200">{t('pages.findTalent.noAgenciesFound')}</h3>
                            <p className="text-slate-500 dark:text-slate-400 mt-2">{t('pages.findTalent.tryAdjusting')}</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default FindTalentPage;
