import React, { useState, useMemo } from 'react';
import { Job, Milestone, MilestoneStatus, Task, User, TaskStatus } from '@/types';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import Card from '@/components/ui/Card';
import { DataTableTaskView } from '../tasks';
import { DataTable, ColumnDef, KanbanConfig } from '@/components/ui/DataTable';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useTranslation } from '@/hooks/useTranslation';

const TaskCard: React.FC<{ task: Task; users: User[] }> = ({ task, users }) => {
    const assignees = useMemo(() => {
        return task.assignedTo.map(id => users.find(u => u.id === id)).filter(Boolean) as User[];
    }, [task.assignedTo, users]);
    return (
        <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{task.title}</p>
            <div className="flex justify-between items-center mt-2">
                <div className="text-xs text-slate-500">
                    {task.commentsCount > 0 && <span className="mr-2"><i className="fa-regular fa-comment-dots mr-1"></i>{task.commentsCount}</span>}
                    {task.attachmentsCount > 0 && <span><i className="fa-solid fa-paperclip mr-1"></i>{task.attachmentsCount}</span>}
                </div>
                <div className="flex items-center -space-x-2">
                    {assignees.map(user => (
                        <Tooltip key={user.id} content={user.name}>
                            <img src={user.avatarUrl || `https://i.pravatar.cc/40?u=${user.id}`} alt={user.name} className="w-6 h-6 rounded-full border border-white dark:border-slate-800" loading="lazy" decoding="async"/>
                        </Tooltip>
                    ))}
                </div>
            </div>
        </div>
    );
};

const DataTableMilestoneView: React.FC<{ project: Job }> = ({ project }) => {
    const { contracts, users } = useAppState();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const [focusedMilestone, setFocusedMilestone] = useState<Milestone | null>(null);
    const contract = contracts.find(c => c.id === project.contractId);

    const projectTasks = useMemo(() => {
        if (!contract) return [];
        return contract.milestones.flatMap(m => m.tasks);
    }, [contract]);

    if (!contract) {
        return <Card className="p-8 text-center text-slate-500">{t('pages.project.details.milestones.noContract')}</Card>;
    }

    if (focusedMilestone) {
        const tasksForMilestone = projectTasks.filter(task => task.milestoneId === focusedMilestone.id);

        const taskColumns: ColumnDef<Task>[] = [
            { accessorKey: 'title', header: () => 'Task', cell: ({ row }) => row.title },
            { accessorKey: 'status', header: () => 'Status', cell: ({ row }) => row.status },
            { accessorKey: 'priority', header: () => 'Priority', cell: ({ row }) => row.priority },
            { 
                accessorKey: 'assignedTo', 
                header: () => 'Assignees', 
                cell: ({ row }) => {
                    const assignees = row.assignedTo.map(id => users.find(u => u.id === id)).filter(Boolean) as User[];
                    return <div className="flex items-center -space-x-2">{assignees.map(u => <Tooltip key={u.id} content={u.name}><img src={u.avatarUrl} className="w-6 h-6 rounded-full" loading="lazy" decoding="async" /></Tooltip>)}</div>
                } 
            },
        ];

        const taskKanbanConfig: KanbanConfig<Task> = {
            enabled: true,
            groupBy: 'status',
            columns: Object.values(TaskStatus),
            onCardMove: (taskId, newStatus) => {
                dispatch({
                    type: 'UPDATE_TASK_STATUS',
                    payload: { contractId: contract.id, milestoneId: focusedMilestone.id, taskId, newStatus: newStatus as TaskStatus }
                });
            },
            renderCard: (task: Task) => <TaskCard task={task} users={users} />
        };
        
        return (
            <div className="animate-fade-in">
                <div className="flex items-center gap-4 mb-4">
                    <Button variant="outline" onClick={() => setFocusedMilestone(null)}>
                        <i className="fa-solid fa-arrow-left mr-2"></i> Back to Milestones
                    </Button>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                        {focusedMilestone.description}
                    </h2>
                </div>
                <DataTable
                    columns={taskColumns}
                    data={tasksForMilestone}
                    idKey="id"
                    initialView="kanban"
                    kanbanConfig={taskKanbanConfig}
                />
            </div>
        );
    }

    const milestoneColumns: ColumnDef<Milestone>[] = [
        { accessorKey: 'description', header: () => 'Description', cell: ({ row }) => <span className="font-medium">{row.description}</span> },
        { accessorKey: 'amount', header: () => 'Amount', cell: ({ row }) => `$${row.amount.toLocaleString()}` },
        { accessorKey: 'dueDate', header: () => 'Due Date', cell: ({ row }) => new Date(row.dueDate).toLocaleDateString() },
        { 
            accessorKey: 'status', 
            header: () => 'Status', 
            cell: ({ row }) => {
                const statusClasses = {
                    [MilestoneStatus.Pending]: "bg-slate-200 text-slate-700",
                    [MilestoneStatus.Funded]: "bg-blue-100 text-blue-700",
                    [MilestoneStatus.Requested]: "bg-yellow-100 text-yellow-700",
                    [MilestoneStatus.Released]: "bg-green-100 text-green-700",
                };
                return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusClasses[row.status]}`}>{row.status}</span>;
            }
        },
        { 
            accessorKey: 'tasks', 
            header: () => 'Tasks', 
            cell: ({ row }) => projectTasks.filter(t => t.milestoneId === row.id).length
        },
        {
            accessorKey: 'action',
            header: () => 'Action',
            cell: ({ row }) => (
                <Button size="sm" onClick={() => setFocusedMilestone(row)}>
                    View Tasks <i className="fa-solid fa-arrow-right ml-2 text-xs"></i>
                </Button>
            )
        }
    ];

    return (
        <DataTable
            columns={milestoneColumns}
            data={contract.milestones}
            idKey="id"
        />
    );
}

export default DataTableMilestoneView;