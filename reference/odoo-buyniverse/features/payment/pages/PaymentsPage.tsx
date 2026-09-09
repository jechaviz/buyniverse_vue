import React, { useState, useMemo } from 'react';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { useTranslation } from '@/hooks/useTranslation';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { PaymentReceipt, User } from '@/types';
import StatCard from '@/components/ui/StatCard';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/utils/formatters';
import Button from '@/components/ui/Button';
import { useUsers } from '@/hooks/useUsers';

const PaymentsPage: React.FC = () => {
    const { paymentReceipts } = useAppState();
    const { getUserById } = useUsers();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [rowSelection, setRowSelection] = useState({});

    const { stats } = useMemo(() => {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        
        const paymentStats = {
            totalCollected: 0,
            last30days: 0,
        };

        paymentReceipts.forEach(p => {
            if (p.status === 'Vigente') {
                paymentStats.totalCollected += p.amount;
                if (new Date(p.date) >= thirtyDaysAgo) {
                    paymentStats.last30days += p.amount;
                }
            }
        });
        
        return { stats: paymentStats };
    }, [paymentReceipts]);

    const columns = useMemo<ColumnDef<PaymentReceipt>[]>(() => [
        { accessorKey: 'folio', header: () => t('pages.payment.headers.folio'), cell: ({row}) => <Link to={`/payments/${row.id}/edit`} className="font-medium text-sky-600 hover:underline">{row.serie}-{row.folio}</Link>, enableSorting: true },
        { accessorKey: 'date', header: () => t('pages.payment.headers.date'), cell: ({row}) => new Date(row.date).toLocaleDateString(), enableSorting: true },
        { accessorKey: 'receiverId', header: () => t('pages.payment.headers.receiver'), cell: ({row}) => getUserById(row.receiverId)?.name || 'N/A', enableSorting: true, enableFiltering: true },
        { accessorKey: 'amount', header: () => t('pages.payment.headers.amount'), cell: ({row}) => formatCurrency(row.amount, row.currency), enableSorting: true },
        { 
            accessorKey: 'status', 
            header: () => t('pages.payment.headers.status'), 
            cell: ({row}) => {
                const statusClasses = row.status === 'Vigente'
                    ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
                return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusClasses}`}>{t(`pages.payment.statuses.${row.status.toLowerCase()}`)}</span>
            }, 
            enableSorting: true, 
            enableFiltering: true 
        },
        { accessorKey: 'uuid', header: () => t('pages.payment.headers.uuid'), cell: ({row}) => row.uuid ? <span className="font-mono text-xs">{row.uuid.substring(0,8)}...</span> : 'N/A' },
    ], [t, getUserById]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{t('pages.payment.title')}</h1>
                <Link to="/payments/new">
                    <Button><i className="fa-solid fa-plus mr-2"></i> {t('pages.payment.add')}</Button>
                </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard title={t('pages.payment.stats.totalCollected')} value={formatCurrency(stats.totalCollected)} colorClass="bg-stat-green" />
                <StatCard title={t('pages.payment.stats.last30days')} value={formatCurrency(stats.last30days)} colorClass="bg-stat-blue" />
            </div>

             <DataTable
                columns={columns}
                data={paymentReceipts}
                globalFilter={searchTerm}
                onGlobalFilterChange={setSearchTerm}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                idKey="id"
                pageTitle={t('pages.payment.title')}
            />
        </div>
    );
};

export default PaymentsPage;