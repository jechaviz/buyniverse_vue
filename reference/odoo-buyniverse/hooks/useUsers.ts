import { useMemo } from 'react';
import { useAppState } from '@/context/AppStateContext';
import { User } from '@/types';

export const useUsers = () => {
    const { users } = useAppState();

    const usersById = useMemo(() => {
        return new Map(users.map(user => [user.id, user]));
    }, [users]);

    const getUserById = (id: string): User | undefined => {
        return usersById.get(id);
    };

    return {
        allUsers: users,
        getUserById,
    };
};
