import React, { useMemo, useState } from 'react';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { Supplier, Job, JobStatus, UserType, NotificationType } from '@/types';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { useTranslation } from '@/hooks/useTranslation';
import Tooltip from '@/components/ui/Tooltip';
import StarRating from '@/components/ui/StarRating';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

const InviteToProjectModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    suppliers: Supplier[];
    jobs: Job[];
    onInvite: (jobId: string) => void;
}> = ({ isOpen, onClose, suppliers, jobs, onInvite }) => {
    const { t } = useTranslation();
    const [selectedJobId, setSelectedJobId] = useState('');

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Invite ${suppliers.length} Supplier(s)`}>
            <div className="space-y-4">
                <p>Select a draft project to invite these suppliers to:</p>
                <select 
                    value={selectedJobId} 
                    onChange={e => setSelectedJobId(e.target.value)}
                    className="block w-full px-4 py-2 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700/50"
                >
                    <option value="">Select a project...</option>
                    {jobs.map(job => (
                        <option key={job.id} value={job.id}>{job.title}</option>
                    ))}
                </select>
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => onInvite(selectedJobId)} disabled={!selectedJobId}>Send Invitations</Button>
                </div>
            </div>
        </Modal>
    )
}


const SuppliersPage: React.FC = () => {
    const { suppliers, jobs, currentUser, users } = useAppState();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
    const [isInviteModalOpen, setInviteModalOpen] = useState(false);

    const handleSaveRecord = (record: Supplier) => {
        dispatch({ type: 'UPDATE_ENTITY', payload: { entity: 'suppliers', id: record.id, data: record } });
    };

    const handleUpdateCell = (rowId: string, columnId: string, value: any) => {
        dispatch({ type: 'UPDATE_ENTITY', payload: { entity: 'suppliers', id: rowId, data: { [columnId]: value } } });
    };
    
    const selectedSupplierIds = useMemo(() => Object.keys(rowSelection).filter(id => rowSelection[id]), [rowSelection]);
    const selectedSuppliers = useMemo(() => suppliers.filter(s => selectedSupplierIds.includes(s.id)), [suppliers, selectedSupplierIds]);
    
    const draftJobs = useMemo(() => jobs.filter(j => j.status === JobStatus.Draft && j.clientId === currentUser.id), [jobs, currentUser.id]);

    const handleSendInvitations = (jobId: string) => {
        const job = jobs.find(j => j.id === jobId);
        if(!job) return;

        // In a real app, a supplier might be linked to a user account. Here we find the first freelancer to notify.
        const freelancersToInvite = users.filter(u => u.type === UserType.Freelancer).slice(0, selectedSuppliers.length);

        freelancersToInvite.forEach((freelancer, index) => {
            const supplier = selectedSuppliers[index];
            if(!job.invitedFreelancerIds?.includes(freelancer.id)) {
                const notification = {
                    id: `notif-invite-${Date.now()}-${freelancer.id}`,
                    userId: freelancer.id,
                    type: NotificationType.INVITED_TO_JOB,
                    text: `${currentUser.name} has invited you to apply for the job: "${job.title}" (as supplier: ${supplier.name})`,
                    link: `/job/${job.id}`,
                    isRead: false,
                    createdAt: new Date(),
                };
                dispatch({ type: 'INVITE_FREELANCER', payload: { jobId: job.id, freelancerId: freelancer.id, notification } });
            }
        });
        
        alert(`${selectedSuppliers.length} invitation(s) sent!`);
        setInviteModalOpen(false);
        setRowSelection({});
    };

    const columns = useMemo<ColumnDef<Supplier>[]>(() => {
        const StatusPill: React.FC<{ status: Supplier['status'] }> = ({ status }) => {
            const statusClasses: Record<Supplier['status'], string> = {
                'Active': 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400',
                'Inactive': 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
                'Pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-400',
            };
            return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusClasses[status]}`}>{t(`pages.suppliers.statuses.${status}`)}</span>;
        };

        return [
            { accessorKey: 'name', header: () => t('pages.suppliers.headers.name'), cell: ({ row }) => <span className="font-medium">{row.name}</span>, enableSorting: true, enableFiltering: true, editConfig: { type: 'text' } },
            { accessorKey: 'category', header: () => t('pages.suppliers.headers.category'), cell: ({ row }) => row.category, enableSorting: true, enableFiltering: true, editConfig: { type: 'select', options: [{value: 'Software', label: 'Software'}, {value: 'Hardware', label: 'Hardware'}, {value: 'Office Supplies', label: 'Office Supplies'}, {value: 'Consulting', label: 'Consulting'}] } },
            { accessorKey: 'contactPerson', header: () => t('pages.suppliers.headers.contact'), cell: ({ row }) => row.contactPerson, enableSorting: true, editConfig: { type: 'text' } },
            { accessorKey: 'email', header: () => t('pages.suppliers.headers.email'), cell: ({ row }) => <a href={`mailto:${row.email}`} className="text-sky-600 hover:underline">{row.email}</a>, enableSorting: true, editConfig: { type: 'email' } },
            { accessorKey: 'totalSpend', header: () => t('pages.suppliers.headers.totalSpend'), cell: ({ row }) => `$${row.totalSpend.toLocaleString()}`, enableSorting: true, editConfig: { type: 'number' } },
            { accessorKey: 'rating', header: () => t('pages.suppliers.headers.rating'), cell: ({ row }) => <StarRating rating={row.rating} />, enableSorting: true, editConfig: { type: 'rating' } },
            { accessorKey: 'status', header: () => t('pages.suppliers.headers.status'), cell: ({ row }) => <StatusPill status={row.status} />, enableSorting: true, enableFiltering: true, editConfig: { type: 'select', options: [{value: 'Active', label: 'Active'}, {value: 'Inactive', label: 'Inactive'}, {value: 'Pending', label: 'Pending'}] } },
        ];
    }, [t]);

    return (
        <>
        <DataTable
            columns={columns}
            data={suppliers}
            globalFilter={searchTerm}
            onGlobalFilterChange={setSearchTerm}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            idKey="id"
            onSaveRecord={handleSaveRecord}
            onUpdateCell={handleUpdateCell}
            enableCrud
            createMode="page"
            tableId="suppliers"
            dataKey="suppliers"
            pageTitle={t('pages.suppliers.title')}
        >
            <Button onClick={() => setInviteModalOpen(true)} disabled={selectedSupplierIds.length === 0}>
                Invite to Project
            </Button>
        </DataTable>
        <InviteToProjectModal 
            isOpen={isInviteModalOpen}
            onClose={() => setInviteModalOpen(false)}
            suppliers={selectedSuppliers}
            jobs={draftJobs}
            onInvite={handleSendInvitations}
        />
        </>
    );
};

export default SuppliersPage;