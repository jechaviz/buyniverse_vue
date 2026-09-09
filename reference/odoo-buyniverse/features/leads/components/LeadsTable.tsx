import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Lead, LeadStatus, User } from '@/types';
import { useAppState } from '@/context/AppStateContext';
import Tooltip from '@/components/ui/Tooltip';
import { useTranslation } from '@/hooks/useTranslation';

type SortKey = 'contactName' | 'title' | 'createdAt' | 'value' | 'category' | 'status';
type SortDirection = 'asc' | 'desc';

interface LeadsTableProps {
  leads: Lead[];
}

const LeadsTable: React.FC<LeadsTableProps> = ({ leads }) => {
  const { users } = useAppState();
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      
      let comparison = 0;
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else if (aVal instanceof Date && bVal instanceof Date) {
        comparison = aVal.getTime() - bVal.getTime();
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [leads, sortKey, sortDirection]);

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
      setSelectedIds(sortedLeads.map(u => u.id));
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
  
  const formatDate = (date: Date) => {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}-${day}-${year}`;
  }

  const SortableHeader: React.FC<{ sortId: SortKey; children: React.ReactNode; className?: string }> = ({ sortId, children, className }) => (
    <th className={`p-3 text-left text-sm font-semibold text-sky-800 uppercase tracking-wider cursor-pointer select-none ${className}`} onClick={() => handleSort(sortId)}>
      <div className="flex items-center">
        <span>{children}</span>
        <i className={`fa-solid fa-sort ml-2 text-sky-600`}></i>
      </div>
    </th>
  );
  
  const StatusPill: React.FC<{status: LeadStatus}> = ({ status }) => {
    const baseClass = "px-3 py-1 text-xs font-semibold rounded-full";
    const statusClasses = {
        [LeadStatus.New]: "bg-status-new text-slate-700",
        [LeadStatus.Converted]: "bg-status-converted text-green-800",
        [LeadStatus.Qualified]: "bg-status-qualified text-sky-800",
        [LeadStatus.Contacted]: "bg-status-contacted text-orange-800",
        [LeadStatus.Disqualified]: "bg-status-disqualified text-red-800",
    }
    return <span className={`${baseClass} ${statusClasses[status]}`}>{status}</span>
  }

  const AssignedAvatars: React.FC<{ userIds: string[] }> = ({ userIds }) => {
    const assignedUsers = userIds.map(id => users.find(u => u.id === id)).filter(Boolean) as User[];
    return (
        <div className="flex items-center -space-x-2">
            {assignedUsers.slice(0,2).map(user => (
                 <Tooltip key={user.id} content={user.name}>
                    <img src={user.avatarUrl} alt={user.name} className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-800"/>
                </Tooltip>
            ))}
            {assignedUsers.length > 2 && (
                <button className="h-7 w-7 rounded-full flex items-center justify-center bg-slate-200 dark:bg-slate-600 text-xs font-semibold text-slate-600 dark:text-slate-200 border-2 border-white dark:border-slate-800">
                    <i className="fa-solid fa-ellipsis-h"></i>
                </button>
            )}
        </div>
    )
  }

  const ActionIcons: React.FC<{lead: Lead}> = ({ lead }) => (
    <div className="flex items-center gap-3 text-slate-500">
        <Tooltip content={t('common.delete')}>
            <button className="hover:text-red-500">
                <i className={`fa-solid fa-trash-can ${lead.status === LeadStatus.Disqualified ? 'text-red-500' : ''}`}></i>
            </button>
        </Tooltip>
        <Tooltip content="Email">
            <button className="hover:text-orange-500">
                <i className="fa-solid fa-envelope text-orange-400"></i>
            </button>
        </Tooltip>
        <Tooltip content="Assign">
            <button className="hover:text-orange-500">
                <i className="fa-solid fa-user text-orange-400"></i>
            </button>
        </Tooltip>
         <Tooltip content="Open">
            <button className="hover:text-teal-500">
                <i className="fa-solid fa-arrow-up-right-from-square text-teal-500"></i>
            </button>
        </Tooltip>
        <Tooltip content="More">
            <button className="hover:text-slate-700">
                <i className="fa-solid fa-ellipsis-h"></i>
            </button>
        </Tooltip>
         <Tooltip content="Pin">
            <button className="hover:text-slate-700">
                <i className={`fa-solid fa-thumbtack ${lead.status === LeadStatus.Disqualified ? 'text-slate-400' : 'text-orange-400'}`}></i>
            </button>
        </Tooltip>
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-sky-100/50 dark:bg-sky-900/20">
          <tr>
            <th className="p-3 w-4"><input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === sortedLeads.length && sortedLeads.length > 0} className="rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500" /></th>
            <SortableHeader sortId="contactName">{t('pages.leads.headers.contact')}</SortableHeader>
            <SortableHeader sortId="title">{t('pages.leads.headers.title')}</SortableHeader>
            <SortableHeader sortId="createdAt">{t('pages.leads.headers.created')}</SortableHeader>
            <SortableHeader sortId="value">{t('pages.leads.headers.value')}</SortableHeader>
            <th className="p-3 text-left text-sm font-semibold text-sky-800 uppercase tracking-wider">{t('pages.leads.headers.assigned')}</th>
            <SortableHeader sortId="category">{t('pages.leads.headers.category')}</SortableHeader>
            <SortableHeader sortId="status">{t('pages.leads.headers.status')}</SortableHeader>
            <th className="p-3 text-left text-sm font-semibold text-sky-800 uppercase tracking-wider">{t('pages.leads.headers.action')}</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
          {sortedLeads.map(lead => (
              <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                 <td className="p-3 w-4"><input type="checkbox" checked={selectedIds.includes(lead.id)} onChange={() => handleSelectOne(lead.id)} className="rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500" /></td>
                <td className="p-3 text-sm text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">{lead.contactName}</td>
                <td className="p-3 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">{lead.title}</td>
                <td className="p-3 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(lead.createdAt)}</td>
                <td className="p-3 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">${lead.value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td className="p-3"><AssignedAvatars userIds={lead.assignedTo} /></td>
                <td className="p-3 text-sm text-slate-500 dark:text-slate-400">{lead.category}</td>
                <td className="p-3">
                    <div className="flex items-center gap-2">
                        <StatusPill status={lead.status} />
                         {(lead.status === LeadStatus.Converted || lead.status === LeadStatus.Disqualified) && <i className="fa-solid fa-box-archive text-slate-400"></i>}
                    </div>
                </td>
                <td className="p-3"><ActionIcons lead={lead} /></td>
              </tr>
            ))}
        </tbody>
      </table>
      {sortedLeads.length === 0 && <p className="text-center py-8 text-slate-500 dark:text-slate-400">No leads found.</p>}
    </div>
  );
};

export default LeadsTable;