
import React from 'react';
import { Review } from '@/types';
import { ReviewCard } from '@/features/profile';
import Card from '@/components/ui/Card';
import { useTranslation } from '@/hooks/useTranslation';

interface WorkHistoryListProps {
    reviews: Review[];
}

const WorkHistoryList: React.FC<WorkHistoryListProps> = ({ reviews }) => {
    const { t } = useTranslation();
    
    if (reviews.length === 0) {
        return (
             <Card className="p-8 text-center text-slate-500">
                {t('pages.userProfile.noReviews')}
            </Card>
        );
    }
    return (
        <div className="space-y-6">
            {reviews.map(review => (
                <ReviewCard key={review.id} review={review} />
            ))}
        </div>
    );
};

export default WorkHistoryList;
