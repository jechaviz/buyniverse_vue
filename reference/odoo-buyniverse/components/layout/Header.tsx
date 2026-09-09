import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { User, UserType, Job, JobStatus, SourcingType, ProjectLevel, Duration, JobType, ExperienceLevel } from '@/types';
import Dropdown from '@/components/ui/Dropdown';
import { ICONS } from '@/constants';

interface HeaderProps {
    onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
    const { theme, setTheme } = useTheme();
    const { t, language, setLanguage } = useTranslation();
    const { currentUser, users, notifications } = useAppState();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    
    const unreadNotifications = notifications.filter(n => n.userId === currentUser.id && !n.isRead);

    const handleSwitchUser = (userId: string) => {
        dispatch({ type: 'SWITCH_TO_USER', payload: { userId } });
    };
    
    const handleCreateJobDraft = () => {
        const newDraft: Job = {
            id: `job-draft-${Date.now()}`,
            clientId: currentUser.id,
            status: JobStatus.Draft,
            title: '',
            description: '',
            skills: [],
            budget: { type: JobType.FixedPrice, amount: 0 },
            postedAt: new Date(),
            proposals: [],
            experienceLevel: ExperienceLevel.Intermediate,
            requiresNDA: false,
            questions: [],
            approvers: [],
            team: [],
            connectsRequired: 0,
            invitedFreelancerIds: [],
            sourcingType: SourcingType.RFP,
            activity: [],
            milestoneCategories: [],
            comments: [],
            files: [],
            rfiResponses: [],
            shortlistedProviderIds: [],
            currency: currentUser.defaultCurrency || 'USD',
            visibility: 'private',
            projectLevel: ProjectLevel.Basic,
            duration: Duration.Month1To3,
            progress: 0,
        };
        dispatch({ type: 'CREATE_JOB_DRAFT', payload: newDraft });
        navigate(`/post-job/${newDraft.id}`);
    };

    const UserMenu: React.FC = () => (
         <Dropdown
            align="right"
            trigger={
                 <button className="flex items-center gap-2">
                    <img className="w-9 h-9 rounded-full object-cover" src={currentUser.avatarUrl || `https://i.pravatar.cc/40?u=${currentUser.id}`} alt={currentUser.name} loading="lazy" decoding="async" />
                </button>
            }
        >
            <div className="w-60">
                <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{currentUser.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{currentUser.email || (currentUser.type === UserType.Freelancer ? "Freelancer" : "Client")}</p>
                </div>
                <div className="py-1">
                    <Link to={`/profile/${currentUser.id}`} className="block px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">{t('layout.header.userMenu.viewProfile')}</Link>
                    <Link to={`/profile/billing`} className="block px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">{t('layout.header.userMenu.billing')}</Link>
                    <Link to={`/dashboard`} className="block px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">{t('layout.header.dashboard')}</Link>
                    {currentUser.agencyId && <Link to={`/dashboard/my-agency`} className="block px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">{t('layout.breadcrumbs.my-agency')}</Link>}
                    <Link to={`/dashboard`} className="block px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">{t('layout.header.userMenu.settings')}</Link>
                </div>
                <div className="py-1 border-t border-slate-200 dark:border-slate-700">
                     <h4 className="px-3 pt-2 pb-1 text-xs font-bold uppercase text-slate-400">{t('layout.header.userMenu.switchUser')}</h4>
                     <h5 className="px-3 pt-2 pb-1 text-xs font-semibold text-slate-400">{t('layout.header.userMenu.clients')}</h5>
                    {users.filter(u => u.type === UserType.Client).map(user => (
                        <button key={user.id} onClick={() => handleSwitchUser(user.id)} className="w-full text-left block px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                            {user.name}
                        </button>
                    ))}
                    <h5 className="px-3 pt-2 pb-1 text-xs font-semibold text-slate-400">{t('layout.header.userMenu.freelancers')}</h5>
                     {users.filter(u => u.type === UserType.Freelancer).map(user => (
                        <button key={user.id} onClick={() => handleSwitchUser(user.id)} className="w-full text-left block px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                            {user.name}
                        </button>
                    ))}
                     <h5 className="px-3 pt-2 pb-1 text-xs font-semibold text-slate-400">{t('layout.header.userMenu.admins')}</h5>
                     {users.filter(u => u.type === UserType.Admin).map(user => (
                        <button key={user.id} onClick={() => handleSwitchUser(user.id)} className="w-full text-left block px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                            {user.name}
                        </button>
                    ))}
                </div>
                <div className="py-1 border-t border-slate-200 dark:border-slate-700">
                     <button onClick={() => alert('Logged out!')} className="w-full text-left block px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">{t('layout.header.userMenu.logout')}</button>
                </div>
            </div>
        </Dropdown>
    );

    return (
        <header className="flex-shrink-0 bg-white dark:bg-slate-800/50 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700/50 sticky top-0 z-30">
            <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
                <button onClick={onToggleSidebar} className="text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300">
                    <i className="fa-solid fa-bars text-xl"></i>
                </button>
                
                <div className="flex items-center gap-4">
                    {currentUser.permissions.canCreateProjects && (
                        <button onClick={handleCreateJobDraft} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-700 hidden sm:block">
                            {t('layout.header.postAJob')}
                        </button>
                    )}
                     <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300" aria-label="Toggle theme">
                        {theme === 'light' ? ICONS.MOON : ICONS.SUN}
                    </button>
                     <button onClick={() => setLanguage(language === 'en' ? 'es' : 'en')} className="text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300" aria-label="Toggle language">
                        {ICONS.GLOBE}
                    </button>

                    <Dropdown
                        align="right"
                        trigger={
                            <button className="relative text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300">
                                <i className="fa-regular fa-bell text-xl"></i>
                                {unreadNotifications.length > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-4 w-4 bg-primary-500 text-white text-xs items-center justify-center">{unreadNotifications.length}</span>
                                    </span>
                                )}
                            </button>
                        }
                    >
                         <div className="w-80">
                            <div className="p-3 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
                                <h4 className="font-bold">{t('layout.header.notifications')}</h4>
                                <button onClick={() => dispatch({type: 'MARK_NOTIFICATIONS_READ'})} className="text-xs text-primary-600 hover:underline">Mark all as read</button>
                            </div>
                             <ul className="max-h-80 overflow-y-auto">
                                {notifications.slice(0,5).map(n => (
                                     <li key={n.id} className={`border-b border-slate-100 dark:border-slate-700 last:border-b-0 ${!n.isRead ? 'bg-primary-50 dark:bg-primary-500/10' : ''}`}>
                                         <Link to={n.link} className="block p-3 text-sm text-slate-600 dark:text-slate-300 hover:text-primary-600">
                                             {n.text}
                                             <p className="text-xs text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                                        </Link>
                                     </li>
                                ))}
                             </ul>
                             <div className="p-2 border-t border-slate-200 dark:border-slate-700">
                                <Link to="#" className="block text-center text-sm font-semibold text-primary-600 hover:underline">View all notifications</Link>
                             </div>
                         </div>
                    </Dropdown>

                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>

                    <UserMenu />
                </div>
            </div>
        </header>
    );
};

export default React.memo(Header);