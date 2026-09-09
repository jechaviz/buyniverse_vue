

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { User } from '@/types';
import { useAppState } from '@/context/AppStateContext';
import Tooltip from '@/components/ui/Tooltip';
import { useTranslation } from '@/hooks/useTranslation';

type SortKey = 'name' | 'clientId' | 'email' | 'phone' | 'lastSeen';
type SortDirection = 'asc' | 'desc';

interface ClientUsersTableProps {
  users: User[];
}

const timeAgo = (date: Date, t: (key: string, options?: any) => string): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return t('pages.job.card.ago.years', { count: Math.floor(interval) });
    interval = seconds / 2592000;
    if (interval > 1) return t('pages.job.card.ago.months', { count: Math.floor(interval) });
    interval = seconds / 86400;
    if (interval > 1) return t('pages.job.card.ago.days', { count: Math.floor(interval) });
    interval = seconds / 3600;
    if (interval > 1) return t('pages.job.card.ago.hours', { count: Math.floor(interval) });
    interval = seconds / 60;
    if (interval > 1) return t('pages.job.card.ago.minutes', { count: Math.floor(interval) });
    return t('pages.job.card.ago.seconds', { count: Math.floor(seconds) });
}


const ClientUsersTable: React.FC<ClientUsersTableProps> = ({ users: clientUsers }) => {
  const { users: allUsers } = useAppState();
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const sortedUsers = useMemo(() => {
    return [...clientUsers].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      
      let comparison = 0;
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (aVal instanceof Date && bVal instanceof Date) {
        comparison = a.lastSeen!.getTime() - b.lastSeen!.getTime();
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [clientUsers, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };
  
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(sortedUsers.map(u => u.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(pid => pid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const SortableHeader: React.FC<{ sortId: SortKey; children: React.ReactNode; className?: string }> = ({ sortId, children, className }) => (
    <th className={`p-3 text-left text-sm font-semibold text-sky-800 uppercase tracking-wider cursor-pointer select-none ${className}`} onClick={() => handleSort(sortId)}>
      <div className="flex items-center">
        <span>{children}</span>
        <i className={`fa-solid fa-sort ml-2 text-sky-600`}></i>
      </div>
    </th>
  );
  
  const ActionIcons: React.FC<{user: User}> = ({ user }) => (
    <div className="flex items-center gap-3 text-slate-500">
        <Tooltip content={t('common.delete')}>
            <button className="hover:text-red-500">
                <i className={`fa-solid fa-trash-can ${user.name === 'Cody Smith' ? 'text-red-500' : ''}`}></i>
            </button>
        </Tooltip>
        <Tooltip content={t('common.edit')}>
            <button className="hover:text-teal-500">
                <i className="fa-solid fa-pencil text-teal-500"></i>
            </button>
        </Tooltip>
        <Tooltip content="Email">
            <button className="hover:text-orange-500">
                <i className="fa-solid fa-envelope text-orange-400"></i>
            </button>
        </Tooltip>
        <Tooltip content="Lock">
            <button className="hover:text-slate-700">
                <i className="fa-solid fa-lock"></i>
            </button>
        </Tooltip>
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-sky-100 dark:bg-sky-900/50">
          <tr>
            <th className="p-3 w-4"><input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === sortedUsers.length && sortedUsers.length > 0} className="rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500" /></th>
            <SortableHeader sortId="name">{t('pages.clientUsers.headers.name')}</SortableHeader>
            <SortableHeader sortId="clientId">{t('pages.clientUsers.headers.client')}</SortableHeader>
            <SortableHeader sortId="email">{t('pages.clientUsers.headers.email')}</SortableHeader>
            <SortableHeader sortId="phone">{t('pages.clientUsers.headers.phone')}</SortableHeader>
            <SortableHeader sortId="lastSeen">{t('pages.clientUsers.headers.lastSeen')}</SortableHeader>
            <th className="p-3 text-left text-sm font-semibold text-sky-800 uppercase tracking-wider">{t('pages.clientUsers.headers.action')}</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
          {sortedUsers.map(user => {
            const clientCompany = allUsers.find(u => u.id === user.clientId);
            return (
              <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                 <td className="p-3 w-4"><input type="checkbox" checked={selectedIds.includes(user.id)} onChange={() => handleSelectOne(user.id)} className="rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500" /></td>
                <td className="p-3 text-sm text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-3">
                    {user.avatarUrl ? 
                        <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full" /> : 
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500">
                            <i className="fa-solid fa-user"></i>
                        </div>
                    }
                    <span className="font-medium text-slate-800 dark:text-slate-200">{user.name}</span>
                    {user.isStarred && <i className="fa-regular fa-star text-orange-400"></i>}
                  </div>
                </td>
                 <td className="p-3 text-sm text-sky-600 dark:text-sky-400 hover:underline">
                  <Link to={`/profile/${clientCompany?.id}`}>{clientCompany?.companyName || 'N/A'}</Link>
                </td>
                <td className="p-3 text-sm text-sky-600 dark:text-sky-400 hover:underline">
                    <a href={`mailto:${user.email}`}>{user.email}</a>
                </td>
                <td className="p-3 text-sm text-slate-500 dark:text-slate-400">{user.phone || '---'}</td>
                <td className="p-3 text-sm text-slate-500 dark:text-slate-400">{user.lastSeen ? timeAgo(user.lastSeen, t) : '---'}</td>
                <td className="p-3">
                  <ActionIcons user={user} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sortedUsers.length === 0 && <p className="text-center py-8 text-slate-500 dark:text-slate-400">No users found.</p>}
    </div>
  );
};

export default ClientUsersTable;