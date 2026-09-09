
import React, { useMemo, useState } from 'react';
import { Task, TaskStatus, User } from '@/types';
import Card from '@/components/ui/Card';
import Tooltip from '@/components/ui/Tooltip';
import { useAppDispatch } from '@/context/AppStateContext';

const TaskCard: React.FC<{ task: Task; users: User[], onDragStart: (e: React.DragEvent, task: Task) => void }> = ({ task, users, onDragStart }) => {
    const assignees = useMemo(() => {
        return task.assignedTo.map(id => users.find(u => u.id === id)).filter(Boolean) as User[];
    }, [task.assignedTo, users]);
    return (
        <Card 
            draggable 
            onDragStart={(e) => onDragStart(e, task)}
            className="p-3 cursor-grab active:cursor-grabbing"
        >
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
        </Card>
    );
};


interface DataTableTaskViewProps {
    tasks: Task[];
    users: User[];
    contractId: string;
}

const DataTableTaskView: React.FC<DataTableTaskViewProps> = ({ tasks, users, contractId }) => {
    const dispatch = useAppDispatch();
    const [draggedTask, setDraggedTask] = useState<Task | null>(null);

    const columns = [TaskStatus.New, TaskStatus.InProgress, TaskStatus.Testing, TaskStatus.AwaitingFeedback, TaskStatus.Complete];
    
    const groupedTasks = useMemo(() => {
        return tasks.reduce((acc, task) => {
            const status = task.status;
            if (!acc[status]) {
                acc[status] = [];
            }
            acc[status].push(task);
            return acc;
        }, {} as Record<TaskStatus, Task[]>);
    }, [tasks]);

    const handleDragStart = (e: React.DragEvent, task: Task) => {
        setDraggedTask(task);
        e.dataTransfer.setData("taskId", task.id);
    };

    const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
        if (draggedTask && draggedTask.status !== status) {
            dispatch({
                type: 'UPDATE_TASK_STATUS',
                payload: {
                    contractId,
                    milestoneId: draggedTask.milestoneId,
                    taskId: draggedTask.id,
                    newStatus: status
                }
            });
        }
        setDraggedTask(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    return (
        <div className="flex gap-4 p-1 overflow-x-auto bg-slate-100 dark:bg-slate-900/50 rounded-lg min-h-[60vh]">
            {columns.map(status => (
                <div 
                    key={status} 
                    className="w-72 flex-shrink-0 bg-slate-200/50 dark:bg-slate-800/50 rounded-lg p-3 transition-colors"
                    onDrop={(e) => handleDrop(e, status)}
                    onDragOver={handleDragOver}
                >
                    <h3 className="font-semibold text-sm mb-4 px-1 text-slate-600 dark:text-slate-300 uppercase tracking-wider">{status.replace('_', ' ')} ({groupedTasks[status]?.length || 0})</h3>
                    <div className="space-y-3 h-[calc(100%-2.5rem)] overflow-y-auto pr-1">
                        {(groupedTasks[status] || []).map(task => <TaskCard key={task.id} task={task} users={users} onDragStart={handleDragStart} />)}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default DataTableTaskView;
