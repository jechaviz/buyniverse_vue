import React, { useState, useMemo } from 'react';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { useTranslation } from '@/hooks/useTranslation';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { Invoice } from '@/types';
import StatCard from '@/components/ui/StatCard';
import { Link, useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';

const InvoicesPage: React.FC = () => {
    const { invoices } = useAppState();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [rowSelection, setRowSelection] = useState({});

    const { invoiceData, stats } = useMemo(() => {
        const invoiceStats = {
            due: { amount: 0, count: 0 },
            overdue: { amount: 0, count: 0 },
        };

        const data = invoices.map(invoice => {
            let mutableInvoice = { ...invoice };
            if (mutableInvoice.status === 'Vigente' && mutableInvoice.paymentStatus === 'Unpaid' && mutableInvoice.dueDate && typeof mutableInvoice.total === 'number') {
                const dueDate = new Date(mutableInvoice.dueDate);
                if (dueDate < new Date()) {
                    mutableInvoice.paymentStatus = 'Overdue';
                    invoiceStats.overdue.amount += mutableInvoice.total;
                    invoiceStats.overdue.count++;
                } else {
                    invoiceStats.due.amount += mutableInvoice.total;
                    invoiceStats.due.count++;
                }
            }
            return mutableInvoice;
        });
        
        return { invoiceData: data, stats: invoiceStats };
    }, [invoices]);
    
    const handleUpdateCell = (rowId: string, columnId: string, value: any) => {
        dispatch({ type: 'UPDATE_ENTITY', payload: { entity: 'invoices', id: rowId, data: { [columnId]: value } } });
    };

    const formatCurrency = (amount: number) => {
        if (isNaN(amount) || typeof amount !== 'number') {
            amount = 0;
        }
        return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    const handleClone = (invoiceId: string) => {
        const original = invoices.find(inv => inv.id === invoiceId);
        if (!original) return;
        const newInvoice: Partial<Invoice> = {
            ...original,
            id: `inv-draft-${Date.now()}`,
            status: 'Vigente',
            paymentStatus: 'Unpaid',
            uuid: undefined,
            date: new Date(),
            folio: String(Math.floor(1000 + Math.random() * 9000)),
        };
        delete newInvoice.cancellationDetails;
        dispatch({ type: 'ADD_INVOICE', payload: { invoice: newInvoice as Invoice } });
        navigate(`/invoices/${newInvoice.id}/edit`);
    };

    const handleSend = (invoiceId: string) => {
        const invoice = invoices.find(i => i.id === invoiceId);
        if(invoice) {
            alert(`Simulating sending email for invoice ${invoice.serie}-${invoice.folio} to ${invoice.receiver.name}.`);
        }
    };

    const columns = useMemo<ColumnDef<Invoice>[]>(() => {
        const StatusPill: React.FC<{ status: Invoice['paymentStatus'], fiscalStatus: Invoice['status'] }> = ({ status, fiscalStatus }) => {
            if (fiscalStatus === 'Cancelado') {
                 return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300">{t('pages.invoice.statuses.cancelled')}</span>;
            }

            const statusClasses = {
                'Paid': 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
                'Unpaid': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400',
                'Overdue': 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
            };
            return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusClasses[status]}`}>{t(`pages.invoice.statuses.${status.toLowerCase()}`)}</span>;
        };

        return [
            { accessorKey: 'folio', header: () => t('pages.invoice.headers.folio'), cell: ({row}) => <Link to={`/invoices/${row.id}`} className="font-medium text-sky-600 hover:underline">{row.serie}-{row.folio}</Link>, enableSorting: true },
            { accessorKey: 'issuedDate', header: () => t('pages.invoice.headers.date'), cell: ({row}) => {
                const dateToUse = row.issuedDate || row.date;
                return dateToUse ? new Date(dateToUse).toLocaleDateString() : 'N/A';
            }, enableSorting: true, editConfig: { type: 'date' } },
            { accessorKey: 'receiver.name', header: () => t('pages.invoice.headers.receiverName'), cell: ({row}) => row.receiver?.name, enableSorting: true, enableFiltering: true, editConfig: { type: 'text' } },
            { accessorKey: 'total', header: () => t('pages.invoice.headers.total'), cell: ({row}) => formatCurrency(row.total), enableSorting: true, editConfig: { type: 'number' } },
            { accessorKey: 'status', header: () => t('pages.invoice.headers.status'), cell: ({row}) => <StatusPill status={row.paymentStatus} fiscalStatus={row.status} />, enableSorting: true, enableFiltering: true, editConfig: { type: 'select', options: [{value: 'Paid', label: t('pages.invoice.statuses.paid')}, {value: 'Unpaid', label: t('pages.invoice.statuses.unpaid')}]} },
            { 
                accessorKey: 'action',
                header: () => t('pages.invoice.headers.actions'),
                cell: ({ row }) => (
                    <Dropdown
                        align="right"
                        trigger={<Button variant="ghost" size="sm" className="w-8 h-8"><i className="fa-solid fa-ellipsis-h"></i></Button>}
                    >
                        <div className="py-1">
                            <Link to={`/invoices/${row.id}`} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">{t('pages.invoice.actions.view')}</Link>
                            <Link to={`/invoices/${row.id}/edit`} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">{t('pages.invoice.actions.edit')}</Link>
                            <button onClick={() => handleClone(row.id)} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">{t('pages.invoice.actions.clone')}</button>
                            <button onClick={() => handleSend(row.id)} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">{t('pages.invoice.actions.send')}</button>
                        </div>
                    </Dropdown>
                )
            },
        ]
    }, [t, invoices]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{t('pages.invoice.pageTitle')}</h1>
                <Link to="/invoices/new">
                    <Button>
                        <i className="fa-solid fa-plus mr-2"></i>
                        {t('pages.invoice.add')}
                    </Button>
                </Link>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard title={t('pages.invoice.due')} value={formatCurrency(stats.due.amount)} description={`${stats.due.count} Invoices`} colorClass="bg-stat-orange" />
                <StatCard title={t('pages.invoice.overdue')} value={formatCurrency(stats.overdue.amount)} description={`${stats.overdue.count} Invoices`} colorClass="bg-stat-red" />
            </div>

            <DataTable
                columns={columns}
                data={invoiceData}
                idKey="id"
                globalFilter={searchTerm}
                onGlobalFilterChange={setSearchTerm}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                onUpdateCell={handleUpdateCell}
                enableCrud
                pageTitle={t('pages.invoice.pageTitle')}
            />
        </div>
    );
};

export default InvoicesPage;