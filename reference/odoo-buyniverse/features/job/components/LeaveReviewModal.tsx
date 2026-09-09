import React, { useState, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import { useAppDispatch, useAppState } from '@/context/AppStateContext';
import { Job, Review, UserType, ProposalStatus } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';

const StarInput: React.FC<{ rating: number; onRatingChange: (rating: number) => void }> = ({ rating, onRatingChange }) => {
    const [hoverRating, setHoverRating] = useState(0);
    return (
        <div className="flex items-center">
            {[...Array(5)].map((_, index) => {
                const starValue = index + 1;
                return (
                    <svg
                        key={starValue}
                        className={`w-8 h-8 cursor-pointer transition-colors ${starValue <= (hoverRating || rating) ? 'text-yellow-400' : 'text-slate-300'}`}
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        onClick={() => onRatingChange(starValue)}
                        onMouseEnter={() => setHoverRating(starValue)}
                        onMouseLeave={() => setHoverRating(0)}
                    >
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                );
            })}
        </div>
    );
};

const LeaveReviewModal: React.FC<{ isOpen: boolean; onClose: () => void; job: Job; userType: UserType; }> = ({ isOpen, onClose, job, userType }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const dispatch = useAppDispatch();
  const { currentUser, users } = useAppState();
  const { t } = useTranslation();
  
  const recipientId = useMemo(() => {
    if (userType === UserType.Client) {
        return job.proposals.find(p => p.status === ProposalStatus.Accepted)?.freelancerId;
    }
    return job.clientId;
  }, [job, userType]);
  
  const toUser = users.find(u => u.id === recipientId);

  const handleSubmit = () => {
    if (rating === 0 || !comment.trim()) {
      setError(t('components.modals.leaveReview.error'));
      return;
    }
    
    if(!toUser) {
       setError(t('components.modals.leaveReview.errorUser'));
       return;
    }

    const newReview: Review = {
      id: `review-${Date.now()}`,
      jobId: job.id,
      fromUserId: currentUser.id,
      toUserId: toUser.id,
      rating,
      comment,
      submittedAt: new Date(),
    };

    dispatch({ type: 'ADD_REVIEW', payload: newReview });
    onClose();
    // Reset form for next use
    setRating(0);
    setComment('');
    setError('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('components.modals.leaveReview.title', { name: toUser?.name || 'the user' })}>
      <div className="space-y-6">
        <div>
            <p className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('components.modals.leaveReview.rating')}</p>
            <StarInput rating={rating} onRatingChange={setRating} />
        </div>

        <Textarea
          label={t('components.modals.leaveReview.feedback')}
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t('components.modals.leaveReview.placeholder', { name: toUser?.name || 'the user' })}
          required
          rows={5}
        />

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit}>{t('components.modals.leaveReview.submit')}</Button>
        </div>
      </div>
    </Modal>
  );
};

export default LeaveReviewModal;