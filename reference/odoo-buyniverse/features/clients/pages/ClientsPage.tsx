import React, { useMemo, useState, useCallback } from 'react';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { useUsers } from '@/hooks/useUsers';
import { User, UserType, JobStatus, Invoice } from '@/types';
import { DataTable, ColumnDef, ExpandableRelation, PRESETS } from '@/components/ui/DataTable';
import { Link } from 'react-router-dom';
import Tooltip from '@/components/ui/Tooltip';
import UserAvatar from '@/components/ui/UserAvatar';

interface ClientRowData extends User {
    pendingProjects: number;
    invoiceTotal: number;
}

const ClientsPage: React.FC = () => {
    const { users, jobs, invoices } = useAppState();
    const { getUserById } = useUsers();
    const dispatch = useAppDispatch();
    const [searchTerm, setSearchTerm] = useState('');
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

    const clientsData = useMemo<ClientRowData[]>(() => {
        return users
            .filter(u => u.type === UserType.Client)
            .map(client => {
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
    }, [users, jobs, invoices]);

    const handleSaveRecord = useCallback((record: ClientRowData) => {
        const { pendingProjects, invoiceTotal, ...userData } = record;
        const exists = users.some(u => u.id === record.id);
        if (exists) {
            dispatch({ type: 'UPDATE_ENTITY', payload: { entity: 'users', id: record.id, data: userData } });
        } else {
            // dispatch({ type: 'ADD_CLIENT', payload: userData });
            console.log("Creating new client:", userData);
        }
    }, [dispatch, users]);

    const handleDeleteRecord = useCallback((recordId: string) => {
        console.log("Deleting client:", recordId);
    }, []);

    const columns = useMemo<ColumnDef<ClientRowData>[]>(() => [
        {
            accessorKey: 'id',
            header: () => 'ID',
            cell: ({ row }) => row.id.slice(-2),
            enableSorting: true,
        },
        {
            accessorKey: 'companyName',
            header: () => 'Company Name',
            cell: ({ row }) => (
                <Link to={`/profile/${row.id}`} className="font-medium text-sky-600 dark:text-sky-400 hover:underline">
                    {row.companyName}
                </Link>
            ),
            enableSorting: true,
            enableFiltering: true,
            editConfig: { type: 'text' },
        },
        {
            accessorKey: 'accountOwnerId',
            header: () => 'Account Owner',
            cell: ({ row }) => {
                const owner = getUserById(row.accountOwnerId || '');
                return (
                    <div className="flex items-center gap-2">
                        <UserAvatar userId={row.accountOwnerId || ''} className="w-6 h-6" />
                        <span>{owner?.name || 'N/A'}</span>
                    </div>
                );
            },
            enableSorting: true,
            enableFiltering: true,
            editConfig: { type: 'user' },
        },
        {
            accessorKey: 'pendingProjects',
            header: () => 'Pending Projects',
            cell: ({ row }) => <div className="text-center">{row.pendingProjects}</div>,
            enableSorting: true,
        },
        {
            accessorKey: 'invoiceTotal',
            header: () => 'Invoices',
            cell: ({ row }) => `$${row.invoiceTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            enableSorting: true,
        },
        {
            accessorKey: 'tags',
            header: () => 'Tags',
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    {row.tags?.map(tag => (
                        <span key={tag} className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-md">{tag}</span>
                    ))}
                </div>
            ),
            enableSorting: false,
            enableFiltering: true,
            editConfig: { type: 'tags' },
        },
        {
            accessorKey: 'category',
            header: () => 'Category',
            cell: ({ row }) => row.category,
            enableSorting: true,
            enableFiltering: true,
            editConfig: { type: 'text' },
        },
        {
            accessorKey: 'clientStatus',
            header: () => 'Status',
            cell: ({ row }) => (
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${row.clientStatus === 'Active' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-800'}`}>
                    {row.clientStatus}
                </span>
            ),
            enableSorting: true,
            enableFiltering: true,
            editConfig: { type: 'select', options: [{value: 'Active', label: 'Active'}, {value: 'Inactive', label: 'Inactive'}] },
        },
    ], [getUserById]);

    const expandableRelations = useMemo<ExpandableRelation<ClientRowData>[]>(() => [
        {
            label: 'View Branches',
            hasDataChecker: (row) => !!row.branches && row.branches.length > 0,
            getNestedTableProps: (row) => ({
                uiConfig: PRESETS.subTable,
                columns: [
                    { accessorKey: 'name', header: () => 'Branch Name', cell: ({row: branch}) => branch.name },
                    { accessorKey: 'postalCode', header: () => 'Postal Code', cell: ({row: branch}) => branch.postalCode },
                ],
                data: row.branches || [],
                idKey: 'id',
            }),
        },
    ], []);


    return (
        <DataTable
            columns={columns}
            data={clientsData}
            globalFilter={searchTerm}
            onGlobalFilterChange={setSearchTerm}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            idKey="id"
            expandableRelations={expandableRelations}
            onSaveRecord={handleSaveRecord}
            onDeleteRecord={handleDeleteRecord}
            enableCrud
            createMode="page"
            pageTitle="Clients"
        />
    );
};

export default ClientsPage;