
import React, { useState, useMemo } from 'react';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { useUsers } from '@/hooks/useUsers';
import { useTranslation } from '@/hooks/useTranslation';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { Expense, ExpenseStatus, User, Job } from '@/types';
import StatCard from '@/components/ui/StatCard';
import Tooltip from '@/components/ui/Tooltip';
import UserAvatar from '@/components/ui/UserAvatar';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/utils/formatters';

const ExpensesPage: React.FC = () => {
    const { expenses, jobs } = useAppState();
    const { getUserById } = useUsers();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [rowSelection, setRowSelection] = useState({});

    const { expenseData, stats } = useMemo(() => {
        const expenseStats = {
            count: expenses.length,
            total: 0,
            invoiced: 0,
            notInvoiced: 0,
        };
        
        const data = expenses.map(expense => {
            expenseStats.total += expense.amount;
            if (expense.status === ExpenseStatus.Invoiced) {
                expenseStats.invoiced += expense.amount;
            } else {
                expenseStats.notInvoiced += expense.amount;
            }

            return {
                ...expense,
                user: getUserById(expense.userId),
                client: getUserById(expense.clientId || ''),
                project: jobs.find(j => j.id === expense.projectId),
            };
        });
        
        return { expenseData: data, stats: expenseStats };
    }, [expenses, jobs, getUserById]);


    const handlePinToggle = (expenseId: string) => {
        const expense = expenses.find(p => p.id === expenseId);
        if (expense) {
            dispatch({
                type: 'UPDATE_EXPENSE',
                payload: { id: expenseId, data: { isPinned: !expense.isPinned } }
            });
        }
    };

    const handleUpdateCell = (rowId: string, columnId: string, value: any) => {
        // Convert 'true'/'false' strings back to boolean for 'billable'
        const updateData = columnId === 'billable' ? { [columnId]: value === 'true' } : { [columnId]: value };
        dispatch({ type: 'UPDATE_ENTITY', payload: { entity: 'expenses', id: rowId, data: updateData } });
    };

    const columns = useMemo<ColumnDef<typeof expenseData[0]>[]>(() => [
        {
            accessorKey: 'date',
            header: () => t('pages.expenses.headers.date'),
            cell: ({ row }) => new Date(row.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-'),
            enableSorting: true,
            editConfig: { type: 'date' },
        },
        {
            accessorKey: 'description',
            header: () => t('pages.expenses.headers.description'),
            cell: ({ row }) => <span className="font-medium text-slate-700 dark:text-slate-200">{row.description}</span>,
            enableSorting: true,
            enableFiltering: true,
            editConfig: { type: 'text' },
        },
        {
            accessorKey: 'userId',
            header: () => t('pages.expenses.headers.user'),
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <UserAvatar userId={row.user?.id || ''} className="w-7 h-7" />
                    <span>{row.user?.name}</span>
                </div>
            ),
            enableFiltering: true,
            editConfig: { type: 'user' },
        },
        {
            accessorKey: 'clientId',
            header: () => t('pages.expenses.headers.client'),
            cell: ({ row }) => row.client ? (
                <Link to={`/profile/${row.client.id}`} className="text-sky-600 hover:underline">{row.client.companyName || row.client.name}</Link>
            ) : '---',
            enableFiltering: true,
            editConfig: { type: 'text' },
        },
        {
            accessorKey: 'projectId',
            header: () => t('pages.expenses.headers.project'),
            cell: ({ row }) => row.project ? (
                <Link to={`/project/${row.project.id}`} className="text-sky-600 hover:underline truncate block max-w-[120px]">{row.project.title}</Link>
            ) : '---',
            enableFiltering: true,
            editConfig: { type: 'text' },
        },
        {
            accessorKey: 'amount',
            header: () => t('pages.expenses.headers.amount'),
            cell: ({ row }) => formatCurrency(row.amount),
            enableSorting: true,
            editConfig: { type: 'number' },
        },
        {
            accessorKey: 'billable',
            header: () => t('pages.expenses.headers.status'),
            cell: ({ row }) => (
                <Tooltip content={row.billable ? 'Billable' : 'Not Billable'}>
                    <button className={`h-8 w-8 rounded-lg flex items-center justify-center ${row.billable ? 'text-teal-500' : 'text-slate-400'}`}>
                        <i className="fa-solid fa-credit-card"></i>
                    </button>
                </Tooltip>
            ),
            enableFiltering: true,
            editConfig: { type: 'select', options: [{value: 'true', label: 'Billable'}, {value: 'false', label: 'Not Billable'}] },
        },
    ], [t, dispatch]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{t('pages.expenses.title')}</h1>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title={t('pages.expenses.count')} value={stats.count.toString()} colorClass="bg-sky-500" />
                <StatCard title={t('pages.expenses.total')} value={formatCurrency(stats.total)} colorClass="bg-teal-500" />
                <StatCard title={t('pages.expenses.invoiced')} value={formatCurrency(stats.invoiced)} colorClass="bg-orange-500" />
                <StatCard title={t('pages.expenses.notInvoiced')} value={formatCurrency(stats.notInvoiced)} colorClass="bg-red-500" />
            </div>

            <DataTable
                columns={columns}
                data={expenseData}
                globalFilter={searchTerm}
                onGlobalFilterChange={setSearchTerm}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                idKey="id"
                onUpdateCell={handleUpdateCell}
                enableCrud
                pageTitle="Expenses"
            />
        </div>
    );
};

export default ExpensesPage;
