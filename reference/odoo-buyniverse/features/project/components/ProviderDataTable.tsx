import React, { useMemo, useState } from 'react';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { Job, Proposal, SourcingType, JobStatus, RfiResponse } from '@/types';
import { DataTable, ColumnDef, KanbanConfig } from '@/components/ui/DataTable';
import ProviderCardWrapper from './ProviderCard';
import RfiResponseCardWrapper from './RfiResponseCard';

interface ProviderDataTableProps {
    project: Job;
    onShortlist: (providerId: string) => void;
}

const ProviderDataTable: React.FC<ProviderDataTableProps> = ({ project, onShortlist }) => {
    const { users } = useAppState();
    const [searchTerm, setSearchTerm] = useState('');
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

    const isRfiStage = project.sourcingType === SourcingType.RFI && project.status === JobStatus.RFI;

    const providerData = useMemo(() => {
        if (isRfiStage) {
            return (project.rfiResponses || []).map(response => {
                const provider = users.find(u => u.id === response.providerId);
                return { ...response, provider };
            });
        }
        return project.proposals.map(proposal => {
            const provider = users.find(u => u.id === proposal.freelancerId);
            return { ...proposal, provider };
        });
    }, [project, users, isRfiStage]);

    // Columns are only for the table view, which might not be used much here.
    const columns = useMemo<ColumnDef<any>[]>(() => {
        if (isRfiStage) {
             return [
                { accessorKey: 'provider', header: () => 'Provider', cell: ({ row }) => row.provider?.name || 'N/A' },
                { accessorKey: 'idea', header: () => 'Idea', cell: ({ row }) => <p className="line-clamp-2">{row.idea}</p> },
            ];
        }
        return [
            { accessorKey: 'provider', header: () => 'Provider', cell: ({ row }) => row.provider?.name || 'N/A' },
            { accessorKey: 'bid', header: () => 'Bid', cell: ({ row }) => `$${row.bid}` },
            { accessorKey: 'status', header: () => 'Status', cell: ({ row }) => row.status },
        ];
    }, [isRfiStage]);

    const cardRenderer = (row: any) => {
        if (isRfiStage) {
            const isShortlisted = project.shortlistedProviderIds?.includes(row.providerId) || false;
            return RfiResponseCardWrapper(row, onShortlist, isShortlisted);
        }
        return ProviderCardWrapper(row);
    }
    
    const idKey = isRfiStage ? 'providerId' : 'id';

    return (
        <DataTable
            columns={columns}
            data={providerData}
            idKey={idKey}
            initialView="cards"
            uiConfig={{
                cardShell: false,
                toolbar: true,
                pagination: true,
                header: false,
            }}
            globalFilter={searchTerm}
            onGlobalFilterChange={setSearchTerm}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            pageTitle="Providers"
            renderCard={cardRenderer} // Pass the dynamic card renderer
        />
    );
};

export default ProviderDataTable;
