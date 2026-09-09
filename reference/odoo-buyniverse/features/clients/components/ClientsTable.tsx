import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { User, JobStatus } from '@/types';
import { useAppState } from '@/context/AppStateContext';
import Tooltip from '@/components/ui/Tooltip';

type SortKey = 'id' | 'companyName' | 'accountOwnerId' | 'pendingProjects' | 'invoices';
type SortDirection = 'asc' | 'desc';

interface ClientRowData extends User {
    pendingProjects: number;
    invoiceTotal: number;
}

interface ClientsTableProps {
  clients: User[];
}

const ClientsTable: React.FC<ClientsTableProps> = ({ clients }) => {
  const { users, jobs, invoices } = useAppState();
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const clientData = useMemo<ClientRowData[]>(() => {
    return clients.map(client => {
      const clientJobs = jobs.filter(j => j.clientId === client.id);
      const pendingProjects = clientJobs.filter(j => j.status === JobStatus.InProgress || j.status === JobStatus.OnHold).length;
      const clientInvoices = invoices.filter(i => i.clientId === client.id);
      const invoiceTotal = clientInvoices.reduce((sum, inv) => sum + inv.amount, 0);

      return {
        ...client,
        pendingProjects,
        invoiceTotal,
      };
    });
  }, [clients, jobs, invoices]);


  const sortedClients = useMemo(() => {
    return [...clientData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      
      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [clientData, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
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

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-sky-100 dark:bg-sky-900/50">
          <tr>
            <SortableHeader sortId="id">ID</SortableHeader>
            <SortableHeader sortId="companyName">Company Name</SortableHeader>
            <SortableHeader sortId="accountOwnerId">Account Owner</SortableHeader>
            <SortableHeader sortId="pendingProjects">Pending Projects</SortableHeader>
            <SortableHeader sortId="invoices">Invoices</SortableHeader>
            <th className="p-3 text-left text-sm font-semibold text-sky-800 uppercase tracking-wider">Tags</th>
            <th className="p-3 text-left text-sm font-semibold text-sky-800 uppercase tracking-wider">Category</th>
            <th className="p-3 text-left text-sm font-semibold text-sky-800 uppercase tracking-wider">Status</th>
            <th className="p-3 text-left text-sm font-semibold text-sky-800 uppercase tracking-wider">Action</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
          {sortedClients.map(client => {
            const owner = users.find(u => u.id === client.accountOwnerId);
            return (
              <tr key={client.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="p-3 text-sm text-slate-500 dark:text-slate-400">{client.id.slice(-2)}</td>
                <td className="p-3 text-sm font-medium text-sky-600 dark:text-sky-400 hover:underline">
                  <Link to={`/profile/${client.id}`}>{client.companyName}</Link>
                </td>
                <td className="p-3 text-sm text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    {owner?.avatarUrl ? <img src={owner.avatarUrl} alt={owner.name} className="w-6 h-6 rounded-full" /> : <div className="w-6 h-6 rounded-full bg-slate-200" />}
                    <span>{owner?.name || 'N/A'}</span>
                  </div>
                </td>
                <td className="p-3 text-sm text-slate-500 dark:text-slate-400 text-center">{client.pendingProjects}</td>
                <td className="p-3 text-sm text-slate-500 dark:text-slate-400">${client.invoiceTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td className="p-3">
                    <div className="flex items-center gap-1">
                        {client.tags?.map(tag => (
                            <span key={tag} className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-md">{tag}</span>
                        ))}
                         <button className="h-6 w-6 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600"><i className="fa-solid fa-ellipsis-h text-xs"></i></button>
                    </div>
                </td>
                <td className="p-3 text-sm text-slate-500 dark:text-slate-400">{client.category}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${client.clientStatus === 'Active' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-800'}`}>
                    {client.clientStatus}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Tooltip content="Delete"><button className="hover:text-red-500"><i className="fa-solid fa-trash-can"></i></button></Tooltip>
                    <Tooltip content="Edit"><button className="hover:text-green-500"><i className="fa-solid fa-pencil"></i></button></Tooltip>
                    <Tooltip content="Email"><button className="hover:text-blue-500"><i className="fa-solid fa-envelope"></i></button></Tooltip>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sortedClients.length === 0 && <p className="text-center py-8 text-slate-500 dark:text-slate-400">No clients found.</p>}
    </div>
  );
};

export default ClientsTable;
