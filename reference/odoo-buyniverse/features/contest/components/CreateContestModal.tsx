import React, { useState } from 'react';
import { useAppDispatch } from '@/context/AppStateContext';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Job, Contest, ContestStatus, NotificationType, Conversation } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import * as ReactRouterDOM from 'react-router-dom';

const { useNavigate } = ReactRouterDOM;

interface CreateContestModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job;
}

const CreateContestModal: React.FC<CreateContestModalProps> = ({ isOpen, onClose, job }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [showNames, setShowNames] = useState(true);
  const [showBids, setShowBids] = useState(true);

  const handleCreateContest = () => {
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
    const contestId = `contest-${job.id}`;
    const conversationId = `convo-${contestId}`;

    const newContest: Contest = {
      id: contestId,
      jobId: job.id,
      status: ContestStatus.Active,
      startTime,
      endTime,
      showParticipantNames: showNames,
      showParticipantOffers: showBids,
      conversationId,
      bidHistory: [],
    };
    
    const participants = [job.clientId, ...job.proposals.map(p => p.freelancerId)];
    const newConversation: Conversation = {
        id: conversationId,
        jobId: job.id,
        participants,
        messages: [],
    };
    
    const notifications = job.proposals.map(p => ({
        id: `notif-contest-start-${p.freelancerId}`,
        userId: p.freelancerId,
        type: NotificationType.CONTEST_STARTED,
        text: `A live contest has started for the job: "${job.title}"! Join now to place your bid.`,
        link: `/project/${job.id}/contest`,
        isRead: false,
        createdAt: new Date(),
    }));

    dispatch({ type: 'CREATE_CONTEST', payload: { contest: newContest, conversation: newConversation, notifications } });
    onClose();
    navigate(`/project/${job.id}/contest`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('components.modals.createContest.title')}>
      <div className="space-y-6">
        <p className="text-sm text-slate-600 dark:text-slate-300">{t('components.modals.createContest.description')}</p>
        
        <Input
          label={t('components.modals.createContest.duration')}
          type="number"
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
          min="5"
          max="60"
          step="5"
        />

        <div>
            <h4 className="font-semibold text-sm mb-2">{t('components.modals.createContest.visibility')}</h4>
            <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={showNames} onChange={(e) => setShowNames(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <span className="text-slate-700 dark:text-slate-300 text-sm">{t('components.modals.createContest.showNames')}</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={showBids} onChange={(e) => setShowBids(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <span className="text-slate-700 dark:text-slate-300 text-sm">{t('components.modals.createContest.showBids')}</span>
                </label>
            </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleCreateContest}>{t('components.modals.createContest.startContest')}</Button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateContestModal;