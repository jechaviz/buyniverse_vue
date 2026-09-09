

import React, { useState, useMemo } from 'react';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { Job, User, UserType, NotificationType } from '@/types';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
import * as ReactRouterDOM from 'react-router-dom';

const { Link } = ReactRouterDOM;

const InviteFreelancersModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    job: Job;
}> = ({ isOpen, onClose, job }) => {
    const { currentUser, users } = useAppState();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    
    const [invitedIds, setInvitedIds] = useState<string[]>([]);

    const availableFreelancers = useMemo(() => {
        const appliedIds = job.proposals.map(p => p.freelancerId);
        const alreadyInvitedIds = job.invitedFreelancerIds || [];
        return users.filter(u => 
            u.type === UserType.Freelancer && 
            !appliedIds.includes(u.id) &&
            !alreadyInvitedIds.includes(u.id)
        );
    }, [users, job]);

    const handleInvite = (freelancer: User) => {
        const notification = {
            id: `notif-invite-${Date.now()}`,
            userId: freelancer.id,
            type: NotificationType.INVITED_TO_JOB,
            text: `${currentUser.name} has invited you to apply for the job: "${job.title}"`,
            link: `/job/${job.id}`,
            isRead: false,
            createdAt: new Date(),
        };

        dispatch({ type: 'INVITE_FREELANCER', payload: { jobId: job.id, freelancerId: freelancer.id, notification } });
        setInvitedIds(prev => [...prev, freelancer.id]);
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('components.modals.inviteFreelancer.title')}>
            {availableFreelancers.length > 0 ? (
                <div className="space-y-4">
                    <p>{t('components.modals.inviteFreelancer.description')}</p>
                    <ul className="max-h-80 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-700 border-y border-slate-200 dark:border-slate-700">
                        {availableFreelancers.map(freelancer => (
                            <li key={freelancer.id} className="p-3 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">{freelancer.name}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{freelancer.headline}</p>
                                </div>
                                <Button 
                                    size="sm" 
                                    onClick={() => handleInvite(freelancer)}
                                    disabled={invitedIds.includes(freelancer.id)}
                                >
                                    {invitedIds.includes(freelancer.id) ? t('components.modals.inviteFreelancer.invitationSent') : t('components.modals.inviteFreelancer.invite')}
                                </Button>
                            </li>
                        ))}
                    </ul>
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
                    </div>
                </div>
            ) : (
                <div className="text-center">
                    <p className="text-slate-600 dark:text-slate-300 mb-4">{t('components.modals.inviteFreelancer.noFreelancers')}</p>
                    <Link to="/find-talent"><Button>{t('layout.header.findTalent')}</Button></Link>
                </div>
            )}
        </Modal>
    )
}

export default InviteFreelancersModal;