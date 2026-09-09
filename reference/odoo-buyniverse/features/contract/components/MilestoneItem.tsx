

import React, { useState, useMemo } from 'react';
import { Milestone, MilestoneStatus, UserType, Contract, NotificationType, Notification, Task, User, Agency, Transaction, TransactionType, TaskStatus, TaskPriority } from '@/types';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useTranslation } from '@/hooks/useTranslation';
import { DataTable, ColumnDef, PRESETS } from '@/components/ui/DataTable';
import Card from '@/components/ui/Card';
import Tooltip from '@/components/ui/Tooltip';

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
                            <img src={user.avatarUrl || `https://i.pravatar.cc/40?u=${user.id}`} alt={user.name} className="w-6 h-6 rounded-full border border-white dark:border-slate-800"/>
                        </Tooltip>
                    ))}
                </div>
            </div>
        </div>
    );
};


const AddTaskForm: React.FC<{ contract: Contract; milestoneId: string; onCancel: () => void; }> = ({ contract, milestoneId, onCancel }) => {
    const dispatch = useAppDispatch();
    const [title, setTitle] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const { users, agencies } = useAppState();
    const { t } = useTranslation();

    const providerIsAgency = !!agencies.find(a => a.id === contract.providerId);
    
    const possibleAssignees = useMemo(() => {
        if (!providerIsAgency) {
            return users.filter(u => u.id === contract.providerId);
        }
        const agency = agencies.find(a => a.id === contract.providerId);
        if (!agency) return [];
        return users.filter(u => agency.members.some(m => m.userId === u.id));
    }, [contract, users, agencies, providerIsAgency]);


    const handleSubmit = () => {
        if (!title) return;
        const newTask: Task = {
            id: `task-${Date.now()}`,
            title,
            milestoneId: milestoneId,
            status: TaskStatus.New,
            priority: TaskPriority.Normal,
            assignedTo: assignedTo ? [assignedTo] : [],
            createdAt: new Date(),
            commentsCount: 0,
            attachmentsCount: 0,
        };
        dispatch({ type: 'CREATE_TASK', payload: { contractId: contract.id, milestoneId, task: newTask } });
        onCancel();
    };

    return (
        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg mt-2 space-y-2">
            <Input
                label={t('pages.contract.newTask')}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={t('pages.contract.newTaskPlaceholder')}
            />
            {providerIsAgency && possibleAssignees.length > 1 && (
                 <select
                    value={assignedTo}
                    onChange={e => setAssignedTo(e.target.value)}
                    className="block w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-primary-500 focus:border-primary-500"
                >
                    <option value="">{t('pages.contract.assignTo')}</option>
                    {possibleAssignees.map(user => (
                        <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                </select>
            )}
            <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={onCancel}>{t('common.cancel')}</Button>
                <Button size="sm" onClick={handleSubmit}>{t('pages.contract.addTask')}</Button>
            </div>
        </div>
    );
};


const MilestoneItem: React.FC<{ milestone: Milestone; contract: Contract }> = ({ milestone, contract }) => {
    const { currentUser, users, agencies } = useAppState();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isAddingTask, setIsAddingTask] = useState(false);

    const isClient = currentUser.type === UserType.Client;
    
    const providerUser = useMemo(() => {
        const agency = agencies.find(a => a.id === contract.providerId);
        if (agency) {
            const owner = users.find(u => u.id === agency.ownerId);
            return owner; // for notification purposes, send to owner or a primary contact
        }
        return users.find(u => u.id === contract.providerId);
    }, [users, agencies, contract.providerId]);
    
    const providerDisplay = agencies.find(a => a.id === contract.providerId) || users.find(u => u.id === contract.providerId);


    const handleFund = () => {
        if (!window.confirm(t('pages.contract.confirmFund', { amount: milestone.amount }))) return;
        if (!providerUser) return;
        const notification: Notification = {
            id: `notif-${Date.now()}`,
            userId: providerUser.id,
            type: NotificationType.MILESTONE_FUNDED,
            text: `Milestone "${milestone.description}" has been funded by ${currentUser.name}.`,
            link: `/contract/${contract.id}`,
            isRead: false,
            createdAt: new Date(),
        };
        dispatch({ type: 'FUND_MILESTONE', payload: { contractId: contract.id, milestoneId: milestone.id, notification } });
    };

    const handleRequestPayment = () => {
         if (!window.confirm(t('pages.contract.confirmRequest'))) return;
         if (!providerDisplay) return;
         const notification: Notification = {
            id: `notif-${Date.now()}`,
            userId: contract.clientId,
            type: NotificationType.PAYMENT_REQUESTED,
            text: `${providerDisplay.name} has requested payment for milestone: "${milestone.description}".`,
            link: `/contract/${contract.id}`,
            isRead: false,
            createdAt: new Date(),
        };
        dispatch({ type: 'REQUEST_MILESTONE_PAYMENT', payload: { contractId: contract.id, milestoneId: milestone.id, notification } });
    };
    
    const handleReleasePayment = () => {
        if (!providerDisplay || !providerUser) return;
        if (!window.confirm(t('pages.contract.confirmRelease', { amount: milestone.amount, name: providerDisplay.name }))) return;
        
        const transaction: Transaction = {
            id: `trans-${Date.now()}`,
            userId: contract.providerId, // Money goes to provider's ledger (user or agency)
            type: TransactionType.MILESTONE_RELEASE,
            amount: milestone.amount,
            description: `Payment for milestone: ${milestone.description}`,
            date: new Date(),
            relatedId: contract.id,
            invoiceId: `inv-milestone-${milestone.id}`
        };
        
        const notification: Notification = {
            id: `notif-${Date.now()}`,
            userId: providerUser.id, // Notification for the user
            type: NotificationType.PAYMENT_RELEASED,
            text: `Payment of $${milestone.amount} for milestone "${milestone.description}" has been released!`,
            link: `/dashboard/transactions`,
            isRead: false,
            createdAt: new Date(),
        };
        dispatch({ type: 'RELEASE_MILESTONE_PAYMENT', payload: { contractId: contract.id, milestoneId: milestone.id, notification, transaction } });
    };


    const getStatusBadge = () => {
        switch(milestone.status) {
            case MilestoneStatus.Pending: return <span className="text-xs font-bold uppercase text-gray-500">{t('pages.contract.statusLabels.pending')}</span>
            case MilestoneStatus.Funded: return <span className="text-xs font-bold uppercase text-blue-500">{t('pages.contract.statusLabels.funded')}</span>
            case MilestoneStatus.Requested: return <span className="text-xs font-bold uppercase text-yellow-500">{t('pages.contract.statusLabels.requested')}</span>
            case MilestoneStatus.Released: return <span className="text-xs font-bold uppercase text-green-500">{t('pages.contract.statusLabels.paid')}</span>
            default: return null;
        }
    }

    const taskKanbanConfig: any = {
        enabled: true,
        groupBy: 'status',
        columns: Object.values(TaskStatus),
        onCardMove: (taskId: string, newStatus: string) => {
            dispatch({
                type: 'UPDATE_TASK_STATUS',
                payload: { contractId: contract.id, milestoneId: milestone.id, taskId, newStatus: newStatus as TaskStatus }
            });
        },
        renderCard: (task: Task) => <TaskCard task={task} users={users} />
    };

    const taskColumns: ColumnDef<Task>[] = [
        { accessorKey: 'title', header: () => 'Task', cell: ({row}) => row.title },
    ];
    
    return (
        <li className="py-4">
            <div className="flex justify-between items-center flex-wrap gap-y-2">
                <div className="flex-grow">
                    <button onClick={() => setIsExpanded(!isExpanded)} className="text-left flex items-center gap-2 w-full">
                         <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <p className="font-semibold">{milestone.description}</p>
                    </button>
                    <div className="text-sm text-gray-500 ml-7">
                        Due: {new Date(milestone.dueDate).toLocaleDateString()}
                    </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                    {getStatusBadge()}
                    <span className="font-bold text-lg text-gray-700 dark:text-slate-200">${milestone.amount.toLocaleString()}</span>
                    
                    {isClient && milestone.status === MilestoneStatus.Pending && <Button size="sm" onClick={handleFund}>{t('pages.contract.fund')}</Button>}
                    {isClient && milestone.status === MilestoneStatus.Requested && <Button size="sm" onClick={handleReleasePayment}>{t('pages.contract.releasePayment')}</Button>}
                    {!isClient && milestone.status === MilestoneStatus.Funded && <Button size="sm" onClick={handleRequestPayment}>{t('pages.contract.requestPayment')}</Button>}
                </div>
            </div>
            {isExpanded && (
                <div className="ml-7 mt-4 space-y-2 pl-2 pt-2 border-l-2 border-slate-200 dark:border-slate-700">
                     {isAddingTask ? (
                        <AddTaskForm contract={contract} milestoneId={milestone.id} onCancel={() => setIsAddingTask(false)} />
                    ) : (
                        <div className="flex justify-end mb-2">
                            <Button variant="ghost" size="sm" onClick={() => setIsAddingTask(true)}>{t('pages.contract.addTask')}</Button>
                        </div>
                    )}
                    
                    {milestone.tasks.length > 0 ? (
                        <div className="bg-slate-100 dark:bg-slate-900/50 p-2 rounded-lg">
                             <DataTable
                                columns={taskColumns}
                                data={milestone.tasks}
                                idKey="id"
                                uiConfig={{...PRESETS.subTable, header: false, pagination: false, cardShell: false}}
                                kanbanConfig={taskKanbanConfig}
                            />
                        </div>
                    ) : (
                        <div className="text-center text-sm text-slate-500 py-4">No tasks for this milestone yet.</div>
                    )}
                </div>
            )}
        </li>
    );
};

export default MilestoneItem;