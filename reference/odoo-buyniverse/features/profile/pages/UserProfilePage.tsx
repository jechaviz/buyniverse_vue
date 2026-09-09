
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { UserType, AvailabilityStatus } from '@/types';
import { NotFoundPage } from '@/features/notfound';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ProgressCircle from '@/components/ui/ProgressCircle';
import { ClientProfile, FreelancerProfile } from '@/features/profile';
import { useTranslation } from '@/hooks/useTranslation';
import { InviteFreelancersModal } from '@/features/freelancer';

const UserProfilePage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const { users, jobs, reviews, agencies, currentUser } = useAppState();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const [isInviteModalOpen, setInviteModalOpen] = useState(false);

    const user = users.find(u => u.id === userId);
    
    if (!user) {
        return <NotFoundPage />;
    }

    const isCurrentUserProfile = currentUser.id === user.id;

    const setAvailability = (status: AvailabilityStatus) => {
        dispatch({ type: 'SET_AVAILABILITY', payload: { status } });
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            <aside className="md:col-span-1 space-y-6 md:sticky md:top-24">
                <Card className="p-6">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-24 h-24 rounded-full bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center mb-4 ring-4 ring-white dark:ring-slate-800">
                            <span className="text-4xl font-bold text-primary-600 dark:text-primary-300">{user.name.charAt(0)}</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{user.name}</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">{user.location}</p>
                    </div>
                    {user.type === UserType.Freelancer && currentUser.type === UserType.Client && (
                         <Button className="w-full mt-6" onClick={() => setInviteModalOpen(true)}>{t('pages.userProfile.inviteToJob')}</Button>
                    )}
                </Card>
                
                {user.type === UserType.Freelancer && (
                    <>
                    <Card className="p-6">
                        <h3 className="text-lg font-bold mb-4">{t('pages.userProfile.availability')}</h3>
                        {isCurrentUserProfile ? (
                            <div className="flex gap-2">
                                <Button className="flex-1" variant={user.availabilityStatus === 'Available' ? 'primary' : 'secondary'} onClick={() => setAvailability(AvailabilityStatus.Available)}>{t('pages.userProfile.available')}</Button>
                                <Button className="flex-1" variant={user.availabilityStatus === 'Not Available' ? 'primary' : 'secondary'} onClick={() => setAvailability(AvailabilityStatus.NotAvailable)}>{t('pages.userProfile.notAvailable')}</Button>
                            </div>
                        ) : (
                             <p className={`font-semibold ${user.availabilityStatus === 'Available' ? 'text-green-600' : 'text-red-600'}`}>
                                {user.availabilityStatus === 'Available' ? t('pages.userProfile.available') : t('pages.userProfile.notAvailable')}
                            </p>
                        )}
                    </Card>
                     <Card className="p-6">
                        <h3 className="text-lg font-bold mb-4">{t('pages.userProfile.stats')}</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <ProgressCircle progress={user.jobSuccessScore || 0} size={60} strokeWidth={6} />
                                <div>
                                    <p className="font-semibold">{t('pages.userProfile.jobSuccess')}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('pages.userProfile.jobSuccessDesc')}</p>
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-2xl text-primary-700 dark:text-primary-300">${(user.totalEarned || 0).toLocaleString()}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{t('pages.userProfile.totalEarned')}</p>
                            </div>
                             {user.isIdentityVerified && (
                                <div className="flex items-center gap-2 text-sm text-green-600 justify-center pt-2 border-t border-slate-100 dark:border-slate-700">
                                    <i className="fa-solid fa-check-circle"></i>
                                    <span>{t('pages.userProfile.identityVerified')}</span>
                                </div>
                            )}
                        </div>
                    </Card>
                    </>
                )}
            </aside>
            <main className="md:col-span-2">
                 {user.type === UserType.Freelancer ? 
                    <FreelancerProfile freelancer={user} reviews={reviews} /> : 
                    <ClientProfile client={user} jobs={jobs} reviews={reviews} agencies={agencies} />
                 }
            </main>

            {/* <InviteFreelancersModal isOpen={isInviteModalOpen} onClose={() => setInviteModalOpen(false)} preselectedFreelancer={user}/> */}
        </div>
    );
};

export default UserProfilePage;