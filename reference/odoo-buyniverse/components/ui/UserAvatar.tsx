import React from 'react';
import { useUsers } from '@/hooks/useUsers';
import Tooltip from './Tooltip';

interface UserAvatarProps {
    userId: string;
    className?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ userId, className = 'w-8 h-8' }) => {
    const { getUserById } = useUsers();
    const user = getUserById(userId);

    if (!user) {
        return <div className={`${className} rounded-full bg-slate-200 dark:bg-slate-700`} />;
    }

    const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2);

    return (
        <Tooltip content={user.name}>
            {user.avatarUrl ? (
                <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className={`${className} rounded-full object-cover`}
                    loading="lazy"
                    decoding="async"
                />
            ) : (
                <div
                    className={`${className} rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 dark:text-slate-300 text-xs`}
                >
                    {initials}
                </div>
            )}
        </Tooltip>
    );
};

export default React.memo(UserAvatar);
