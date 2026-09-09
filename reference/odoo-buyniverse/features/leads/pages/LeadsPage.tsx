import React, { useMemo, useState } from 'react';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { useTranslation } from '@/hooks/useTranslation';
import { DataTable, ColumnDef, KanbanConfig } from '@/components/ui/DataTable';
import { Lead, LeadStatus, User } from '@/types';
import Tooltip from '@/components/ui/Tooltip';


const LeadsPage: React.FC = () => {
    const { leads, users } = useAppState();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

    const handleArchiveSelected = () => {
        const idsToArchive = Object.keys(rowSelection).filter(id => rowSelection[id]);
        if (idsToArchive.length > 0 && window.confirm(`Are you sure you want to archive ${idsToArchive.length} lead(s)? This will set their status to Disqualified.`)) {
            dispatch({ type: 'BULK_UPDATE_LEAD_STATUS', payload: { leadIds: idsToArchive, status: LeadStatus.Disqualified }});
            setRowSelection({});
        }
    };
    
    const handleImportLeads = (importedLeads: Omit<Lead, 'id' | 'createdAt' | 'assignedTo'>[]) => {
        dispatch({ type: 'BULK_ADD_LEADS', payload: { leads: importedLeads } });
    };

    const handleSaveRecord = (record: Lead) => {
        dispatch({ type: 'UPDATE_ENTITY', payload: { entity: 'leads', id: record.id, data: record } });
    };

    const handleUpdateCell = (rowId: string, columnId: string, value: any) => {
        dispatch({ type: 'UPDATE_ENTITY', payload: { entity: 'leads', id: rowId, data: { [columnId]: value } } });
    };

    const columns = useMemo<ColumnDef<Lead>[]>(() => {
        const formatDate = (date: Date) => new Date(date).toLocaleDateString('en-CA');
        const StatusPill: React.FC<{status: LeadStatus}> = ({ status }) => {
            const baseClass = "px-3 py-1 text-xs font-semibold rounded-full";
            const statusClasses = {
                'New': "bg-lead-new text-slate-700",
                'Converted': "bg-lead-converted text-white",
                'Qualified': "bg-lead-qualified text-white",
                'Contacted': "bg-lead-contacted text-white",
                'Proposal Sent': "bg-lead-proposal text-white",
                'Disqualified': "bg-lead-disqualified text-white",
            };
            return <span className={`${baseClass} ${statusClasses[status] || statusClasses.New}`}>{status}</span>;
        };
        const AssignedAvatars: React.FC<{ userIds: string[] }> = ({ userIds }) => {
            const assignedUsers = userIds.map(id => users.find(u => u.id === id)).filter(Boolean) as User[];
            return (
                <div className="flex items-center -space-x-2">
                    {assignedUsers.slice(0, 2).map(user => (
                        <Tooltip key={user.id} content={user.name}>
                            <img src={user.avatarUrl} alt={user.name} className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-800" loading="lazy" decoding="async"/>
                        </Tooltip>
                    ))}
                    {assignedUsers.length > 2 && (
                        <button className="h-7 w-7 rounded-full flex items-center justify-center bg-slate-200 dark:bg-slate-600 text-xs font-semibold text-slate-600 dark:text-slate-200 border-2 border-white dark:border-slate-800">
                            <i className="fa-solid fa-ellipsis-h"></i>
                        </button>
                    )}
                </div>
            );
        };

        return [
            { accessorKey: 'contactName', header: () => t('pages.leads.headers.contact'), cell: ({row}) => row.contactName, enableSorting: true, enableFiltering: true, editConfig: { type: 'text' } },
            { accessorKey: 'title', header: () => t('pages.leads.headers.title'), cell: ({row}) => row.title, enableSorting: true, enableFiltering: true, editConfig: {type: 'text'} },
            { accessorKey: 'createdAt', header: () => t('pages.leads.headers.created'), cell: ({row}) => formatDate(row.createdAt), enableSorting: true },
            { accessorKey: 'value', header: () => t('pages.leads.headers.value'), cell: ({row}) => `$${row.value.toLocaleString('en-US', {minimumFractionDigits: 2})}`, enableSorting: true, editConfig: {type: 'number'} },
            { accessorKey: 'assignedTo', header: () => t('pages.leads.headers.assigned'), cell: ({row}) => <AssignedAvatars userIds={row.assignedTo} />, enableSorting: false, editConfig: { type: 'multi-user' } },
            { accessorKey: 'category', header: () => t('pages.leads.headers.category'), cell: ({row}) => row.category, enableSorting: true, enableFiltering: true, editConfig: { type: 'text' } },
            { accessorKey: 'status', header: () => t('pages.leads.headers.status'), cell: ({row}) => (
                <div className="flex items-center gap-2">
                    <StatusPill status={row.status} />
                    {(row.status === LeadStatus.Converted || row.status === LeadStatus.Disqualified) && <i className="fa-solid fa-box-archive text-slate-400"></i>}
                </div>
            ), enableSorting: true, enableFiltering: true, editConfig: {type: 'select', options: Object.values(LeadStatus).map(s => ({value: s, label: s}))} },
        ]
    }, [t, users]);
    
    const kanbanConfig: KanbanConfig<Lead> = {
        enabled: true,
        groupBy: 'status',
        columns: [
            LeadStatus.New,
            LeadStatus.Contacted,
            LeadStatus.Qualified,
            LeadStatus.ProposalSent,
            LeadStatus.Converted,
            LeadStatus.Disqualified,
        ],
        onCardMove: (cardId, newColumnId) => {
            dispatch({ type: 'BULK_UPDATE_LEAD_STATUS', payload: { leadIds: [cardId], status: newColumnId as LeadStatus }})
        },
        renderCard: (item) => (
             <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{item.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.contactName}</p>
                 <div className="flex justify-between items-center mt-3">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">${item.value.toLocaleString()}</span>
                    <div className="flex items-center -space-x-2">
                        {(item.assignedTo.map(id => users.find(u => u.id === id)).filter(Boolean) as User[]).slice(0, 2).map(user => (
                            <Tooltip key={user.id} content={user.name}>
                                <img src={user.avatarUrl} alt={user.name} className="w-6 h-6 rounded-full border border-white dark:border-slate-800" loading="lazy" decoding="async"/>
                            </Tooltip>
                        ))}
                    </div>
                </div>
             </div>
        )
    };

    return (
        <DataTable
            columns={columns}
            data={leads}
            globalFilter={searchTerm}
            onGlobalFilterChange={setSearchTerm}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            idKey="id"
            kanbanConfig={kanbanConfig}
            onImport={handleImportLeads}
            onArchive={handleArchiveSelected}
            tableId="leads"
            dataKey="leads"
            onSaveRecord={handleSaveRecord}
            onUpdateCell={handleUpdateCell}
            enableCrud
            createMode="page"
            pageTitle={t('pages.leads.title')}
        />
    );
};

export default LeadsPage;