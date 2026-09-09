
import React from 'react';
import { User, Review } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import Card from '@/components/ui/Card';
import Tag from '@/components/ui/Tag';
import LazyOnVisible from '@/components/ui/LazyOnVisible';

interface FreelancerProfileProps {
    freelancer: User;
    reviews: Review[];
}

const FreelancerProfile: React.FC<FreelancerProfileProps> = ({ freelancer, reviews }) => {
    const { t } = useTranslation();
    const freelancerReviews = reviews.filter(r => r.toUserId === freelancer.id);
    
    return (
        <div className="space-y-8">
            <Card className="p-8">
                <h2 className="text-xl font-bold mb-2">{freelancer.headline}</h2>
                <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{freelancer.bio}</p>
            </Card>

            <Card className="p-8">
                <h3 className="text-xl font-bold mb-4">{t('pages.userProfile.skills')}</h3>
                <div className="flex flex-wrap gap-2">
                    {freelancer.skills?.map(skill => <Tag key={skill}>{skill}</Tag>)}
                </div>
            </Card>
            
            {freelancer.portfolio && freelancer.portfolio.length > 0 && (
                 <Card className="p-8">
                    <h3 className="text-xl font-bold mb-4">{t('pages.userProfile.portfolio')}</h3>
                    <div className="space-y-6">
                        {freelancer.portfolio.map((item, index) => (
                            <div key={index} className="border-b border-slate-100 dark:border-slate-700 pb-4 last:border-b-0">
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-lg font-semibold text-primary-600 hover:underline">{item.title}</a>
                                <p className="text-slate-600 dark:text-slate-300 mt-1">{item.description}</p>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            <div>
                <h2 className="text-2xl font-bold mb-4">{t('pages.userProfile.workHistory')}</h2>
                 <LazyOnVisible
                    load={() => import('./WorkHistoryList')}
                    fallback={<Card className="p-8 text-center text-slate-500">Loading reviews...</Card>}
                    reviews={freelancerReviews}
                />
            </div>
        </div>
    );
};

export default FreelancerProfile;
