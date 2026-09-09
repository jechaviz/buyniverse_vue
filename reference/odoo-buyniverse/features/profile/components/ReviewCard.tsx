
import React from 'react';
import { Review } from '@/types';
import { useAppState } from '@/context/AppStateContext';
import { useTranslation } from '@/hooks/useTranslation';
import Card from '@/components/ui/Card';
import StarRating from '@/components/ui/StarRating';
import { Link } from 'react-router-dom';

interface ReviewCardProps {
    review: Review;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
    const { users, jobs } = useAppState();
    const { t } = useTranslation();

    const fromUser = users.find(u => u.id === review.fromUserId);
    const job = jobs.find(j => j.id === review.jobId);
    
    if (!fromUser || !job) return null;

    return (
        <Card className="p-6">
            <div className="flex justify-between items-start">
                <div>
                    <Link to={`/job/${job.id}`} className="font-bold text-primary-600 hover:underline">{job.title}</Link>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {t('components.reviewCard.by', { name: fromUser.name, date: new Date(review.submittedAt).toLocaleDateString() })}
                    </p>
                </div>
                <StarRating rating={review.rating} />
            </div>
            <p className="text-slate-700 dark:text-slate-300 mt-4 italic">
                "{review.comment}"
            </p>
        </Card>
    );
};

export default ReviewCard;
