
import React from 'react';
import { Task, TaskStatus } from '@/types';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';

interface TaskItemProps {
    task: Task;
    contractId: string;
    milestoneId: string;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, contractId, milestoneId }) => {
    const { users } = useAppState();
    const dispatch = useAppDispatch();
    const assignedUser = users.find(u => u.id === task.assignedTo[0]);

    const isComplete = task.status === TaskStatus.Complete;

    const handleToggle = () => {
        const newStatus = isComplete ? TaskStatus.InProgress : TaskStatus.Complete;
        dispatch({ type: 'UPDATE_TASK_STATUS', payload: { contractId, milestoneId, taskId: task.id, newStatus } });
    }

    return (
        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50">
            <div className="flex items-center gap-3">
                <input
                    type="checkbox"
                    checked={isComplete}
                    onChange={handleToggle}
                    className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
                <span className={`text-sm ${isComplete ? 'text-gray-400 line-through dark:text-slate-500' : 'text-gray-800 dark:text-slate-200'}`}>
                    {task.title}
                </span>
            </div>
            {assignedUser && (
                 <div title={`Assigned to ${assignedUser.name}`} className="w-7 h-7 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center font-bold text-gray-500 dark:text-slate-300 text-xs flex-shrink-0">
                    {assignedUser.name.charAt(0)}
                </div>
            )}
        </div>
    );
};

export default TaskItem;
