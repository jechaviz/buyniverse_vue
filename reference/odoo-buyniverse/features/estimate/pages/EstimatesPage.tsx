
import React, { useState, useMemo } from 'react';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { useUsers } from '@/hooks/useUsers';
import { useTranslation } from '@/hooks/useTranslation';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { Estimate, User, EstimateStatus } from '@/types';
import StatCard from '@/components/ui/StatCard';
import Tooltip from '@/components/ui/Tooltip';
import UserAvatar from '@/components/ui/UserAvatar';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/utils/formatters';

interface EstimateRowData extends Estimate {
    companyName: string;
    creator: User | undefined;
}

const EstimatesPage: React.FC = () => {
    const { estimates } = useAppState();
    const { getUserById } = useUsers();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [rowSelection, setRowSelection] = useState({});

    const { estimateData, stats } = useMemo(() => {
        const estimateStats = {
            pending: { amount: 0, count: 0 },
            accepted: { amount: 0, count: 0 },
            expired: { amount: 0, count: 0 },
            declined: { amount: 0, count: 0 },
        };

        const data = estimates.map(estimate => {
            const company = getUserById(estimate.companyId);
            const creator = getUserById(estimate.createdById);
            
            switch(estimate.status) {
                case EstimateStatus.Pending:
                    estimateStats.pending.amount += estimate.amount;
                    estimateStats.pending.count++;
                    break;
                case EstimateStatus.Accepted:
                case EstimateStatus.Revised: // Assuming Revised counts as Accepted for stats
                    estimateStats.accepted.amount += estimate.amount;
                    estimateStats.accepted.count++;
                    break;
                case EstimateStatus.Expired:
                    estimateStats.expired.amount += estimate.amount;
                    estimateStats.expired.count++;
                    break;
                case EstimateStatus.Declined:
                    estimateStats.declined.amount += estimate.amount;
                    estimateStats.declined.count++;
                    break;
            }

            return {
                ...estimate,
                companyName: company?.companyName || 'N/A',
                creator: creator,
            };
        });

        return { estimateData: data, stats: estimateStats };
    }, [estimates, getUserById]);
    
    const handleUpdateCell = (rowId: string, columnId: string, value: any) => {
        dispatch({ type: 'UPDATE_ENTITY', payload: { entity: 'estimates', id: rowId, data: { [columnId]: value } } });
    };

    const columns = useMemo<ColumnDef<EstimateRowData>[]>(() => {
        const StatusPill: React.FC<{ status: EstimateStatus }> = ({ status }) => {
            const statusInfo = {
                [EstimateStatus.Accepted]: { text: t('pages.estimate.statuses.accepted'), color: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' },
                [EstimateStatus.Revised]: { text: t('pages.estimate.statuses.revised'), color: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400' },
                [EstimateStatus.New]: { text: t('pages.estimate.statuses.new'), color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' },
                [EstimateStatus.Draft]: { text: t('pages.estimate.statuses.draft'), color: 'bg-slate-200 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300' },
                [EstimateStatus.Pending]: { text: 'Pending', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400' },
                [EstimateStatus.Expired]: { text: 'Expired', color: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400' },
                [EstimateStatus.Declined]: { text: 'Declined', color: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' },
            }[status];
            
            if(!statusInfo) return null;

            return (
                <div className={`flex items-center justify-center w-fit gap-2 px-2.5 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                    <span>{statusInfo.text}</span>
                    {(status === EstimateStatus.Revised || status === EstimateStatus.New) && <i className="fa-regular fa-eye"></i>}
                </div>
            );
        };
        
        return [
            { accessorKey: 'id', header: () => t('pages.estimate.headers.id'), cell: ({row}) => <Link to={`#`} className="font-medium text-sky-600 hover:underline">{row.id.toUpperCase()}</Link>, enableSorting: true },
            { accessorKey: 'date', header: () => t('pages.estimate.headers.date'), cell: ({row}) => new Date(row.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-'), enableSorting: true, editConfig: { type: 'date' } },
            { accessorKey: 'companyName', header: () => t('pages.estimate.headers.companyName'), cell: ({row}) => row.companyName, enableSorting: true, enableFiltering: true, editConfig: { type: 'text' } },
            { accessorKey: 'createdById', header: () => t('pages.estimate.headers.createdBy'), cell: ({row}) => (
                <div className="flex items-center gap-2">
                    <UserAvatar userId={row.creator?.id || ''} className="w-7 h-7" />
                    <span>{row.creator?.name}</span>
                </div>
            ), enableSorting: true, enableFiltering: true, editConfig: { type: 'user' } },
            { accessorKey: 'amount', header: () => t('pages.estimate.headers.amount'), cell: ({row}) => formatCurrency(row.amount), enableSorting: true, editConfig: { type: 'number' } },
            { accessorKey: 'status', header: () => t('pages.estimate.headers.status'), cell: ({row}) => <StatusPill status={row.status} />, enableSorting: true, enableFiltering: true, editConfig: { type: 'select', options: Object.values(EstimateStatus).map(s => ({value: s, label: s})) } },
        ]
    }, [t]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{t('pages.estimate.pageTitle')}</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title={t('pages.estimate.pending')} value={formatCurrency(stats.pending.amount)} description={String(stats.pending.count)} colorClass="bg-stat-blue" />
                <StatCard title={t('pages.estimate.accepted')} value={formatCurrency(stats.accepted.amount)} description={String(stats.accepted.count)} colorClass="bg-stat-green" />
                <StatCard title={t('pages.estimate.expired')} value={formatCurrency(stats.expired.amount)} description={String(stats.expired.count)} colorClass="bg-stat-orange" />
                <StatCard title={t('pages.estimate.declined')} value={formatCurrency(stats.declined.amount)} description={String(stats.declined.count)} colorClass="bg-stat-red" />
            </div>

            <DataTable
                columns={columns}
                data={estimateData}
                globalFilter={searchTerm}
                onGlobalFilterChange={setSearchTerm}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                idKey="id"
                onUpdateCell={handleUpdateCell}
                enableCrud
                pageTitle="Estimates"
            />
        </div>
    );
};

export default EstimatesPage;
