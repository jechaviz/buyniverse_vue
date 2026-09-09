
import React, { useMemo, useState } from 'react';
import { Job, MilestoneCategory, TaskStatus } from '@/types';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { useTranslation } from '@/hooks/useTranslation';
import Tooltip from '@/components/ui/Tooltip';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';

interface MilestonesViewProps {
    project: Job;
    onEdit: (category: MilestoneCategory) => void;
    onDelete: (categoryId: string) => void;
}

interface DisplayMilestone extends MilestoneCategory {
    allTasks: number;
    pendingTasks: number;
    completedTasks: number;
}

const MilestonesView: React.FC<MilestonesViewProps> = ({ project, onEdit, onDelete }) => {
    const { contracts } = useAppState();
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [searchTerm, setSearchTerm] = useState('');
    const [rowSelection, setRowSelection] = useState({});

    const projectTasks = useMemo(() => {
        const projectContract = contracts.find(c => c.id === project.contractId);
        if (!projectContract) return [];
        return projectContract.milestones.flatMap(m => m.tasks);
    }, [contracts, project]);

    const displayMilestones = useMemo<DisplayMilestone[]>(() => {
        const categories = project.milestoneCategories || [];
        return categories.map(category => {
            const tasksInCategory = projectTasks.filter(task => task.milestoneCategoryId === category.id);
            const completedTasks = tasksInCategory.filter(task => task.status === TaskStatus.Complete).length;
            const pendingTasks = tasksInCategory.length - completedTasks;
            return {
                ...category,
                allTasks: tasksInCategory.length,
                pendingTasks: pendingTasks,
                completedTasks: completedTasks,
            };
        });
    }, [project.milestoneCategories, projectTasks]);
    
    const handleRowOrderChange = (reorderedData: DisplayMilestone[]) => {
        dispatch({ type: 'REORDER_MILESTONE_CATEGORIES', payload: { projectId: project.id, orderedCategoryIds: reorderedData.map(c => c.id) } });
    };

    const columns: ColumnDef<DisplayMilestone>[] = useMemo(() => [
        {
            accessorKey: 'name',
            header: () => t('pages.project.details.name'),
            enableSorting: true,
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <i className="fa-solid fa-grip-vertical text-slate-400 cursor-grab"></i>
                    <span className="font-medium text-slate-700 dark:text-slate-200">{row.name}</span>
                    {row.isDefault && <i className="fa-solid fa-star text-amber-400" title="Default category"></i>}
                </div>
            )
        },
        { accessorKey: 'allTasks', header: () => t('pages.project.details.allTasks'), enableSorting: true, cell: ({row}) => row.allTasks },
        { accessorKey: 'pendingTasks', header: () => t('pages.project.details.pendingTasks'), enableSorting: true, cell: ({row}) => row.pendingTasks },
        { accessorKey: 'completedTasks', header: () => t('pages.project.details.completedTasks'), enableSorting: true, cell: ({row}) => row.completedTasks },
        {
            accessorKey: 'color',
            header: () => t('pages.project.details.color'),
            cell: ({ row }) => <span className="block h-5 w-10 rounded-md" style={{ backgroundColor: row.color }}></span>
        },
        {
            accessorKey: 'action',
            header: () => t('pages.project.details.action'),
            cell: ({ row }) => (
                !row.isDefault ? (
                    <div className="flex items-center gap-2">
                        <Tooltip content={t('common.delete')}>
                            <button onClick={() => onDelete(row.id)} className="h-8 w-8 rounded-lg flex items-center justify-center text-red-500/70 hover:text-red-600 hover:bg-red-100/50 dark:hover:bg-red-500/10">
                                <i className="fa-regular fa-trash-can"></i>
                            </button>
                        </Tooltip>
                        <Tooltip content={t('common.edit')}>
                            <button onClick={() => onEdit(row)} className="h-8 w-8 rounded-lg flex items-center justify-center text-sky-600/70 hover:text-sky-700 hover:bg-sky-100/50 dark:hover:bg-sky-500/10">
                                <i className="fa-regular fa-pen-to-square"></i>
                            </button>
                        </Tooltip>
                    </div>
                ) : null
            )
        }
    ], [t, onEdit, onDelete]);

    return (
        <div className="bg-white dark:bg-slate-800/80 rounded-lg border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-sm animate-fade-in">
             <DataTable
                columns={columns}
                data={displayMilestones}
                globalFilter={searchTerm}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                idKey="id"
                enableRowDnd={true}
                onRowOrderChange={handleRowOrderChange}
             />
        </div>
    );
};

export default MilestonesView;