import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { JobStatus, Job } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import Tooltip from '@/components/ui/Tooltip';
import ProgressBar from '@/components/ui/ProgressBar';
import Tag from '@/components/ui/Tag';
import Button from '@/components/ui/Button';

const ProjectsPage: React.FC = () => {
    const { jobs } = useAppState();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [rowSelection, setRowSelection] = useState({});

    const handleUpdateCell = (rowId: string, columnId: string, value: any) => {
        if (columnId === 'progress') {
            dispatch({ type: 'UPDATE_JOB_PROGRESS', payload: { jobId: rowId, progress: value } });
        } else {
            dispatch({ type: 'UPDATE_ENTITY', payload: { entity: 'jobs', id: rowId, data: { [columnId]: value } } });
        }
    };
    
    const columns = useMemo<ColumnDef<Job>[]>(() => [
        {
            accessorKey: 'id',
            header: () => t('pages.project.list.table.id'),
            cell: ({ row }) => <Link to={`/project/${row.id}`} className="font-medium text-sky-600 hover:underline">#{row.id.slice(-4)}</Link>,
            enableSorting: true,
        },
        {
            accessorKey: 'title',
            header: () => t('pages.project.list.table.title'),
            cell: ({ row }) => <Link to={`/project/${row.id}`} className="font-medium">{row.title}</Link>,
            enableSorting: true,
            enableFiltering: true,
            editConfig: { type: 'text' },
        },
        {
            accessorKey: 'startDate',
            header: () => t('pages.project.list.table.startDate'),
            cell: ({ row }) => row.startDate ? new Date(row.startDate).toLocaleDateString() : '---',
            enableSorting: true,
        },
        {
            accessorKey: 'dueDate',
            header: () => t('pages.project.list.table.dueDate'),
            cell: ({ row }) => row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '---',
            enableSorting: true,
        },
        {
            accessorKey: 'skills',
            header: () => t('pages.project.list.table.tags'),
            cell: ({ row }) => (
                <div className="flex flex-wrap gap-1">
                    {row.skills.slice(0, 2).map(skill => <Tag key={skill}>{skill}</Tag>)}
                </div>
            ),
            editConfig: { type: 'tags' },
        },
        {
            accessorKey: 'progress',
            header: () => t('pages.project.list.table.progress'),
            cell: ({ row }) => (
                <div className="w-24">
                    <ProgressBar progress={row.progress || 0} />
                </div>
            ),
            enableSorting: true,
            editConfig: { type: 'slider' },
        },
        {
            accessorKey: 'status',
            header: () => t('pages.project.list.table.status'),
            cell: ({ row }) => <span className="text-sm font-medium">{row.status.replace(/_/g, ' ')}</span>,
            enableSorting: true,
            enableFiltering: true,
            editConfig: { type: 'select', options: Object.values(JobStatus).map(s => ({ value: s, label: (s as string).replace(/_/g, ' ')}))},
        },
        {
            accessorKey: 'action',
            header: () => t('pages.project.list.table.action'),
            cell: ({ row }) => (
                <div className="flex items-center gap-2 text-slate-500">
                    <Tooltip content="View Project"><Link to={`/project/${row.id}`} className="hover:text-sky-500"><i className="fa-solid fa-eye"></i></Link></Tooltip>
                    <Tooltip content="Clone Project"><button className="hover:text-purple-500"><i className="fa-regular fa-copy"></i></button></Tooltip>
                </div>
            )
        }
    ], [t]);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{t('pages.project.list.title')}</h1>
                </div>
                <div>
                     <Link to="/post-job">
                        <Button>
                            <i className="fa-solid fa-plus mr-2"></i> {t('pages.project.list.addProject')}
                        </Button>
                    </Link>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={jobs}
                globalFilter={searchTerm}
                onGlobalFilterChange={setSearchTerm}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                idKey="id"
                onUpdateCell={handleUpdateCell}
                initialGroupByColumns={['status']}
            />
        </div>
    );
};

export default ProjectsPage;