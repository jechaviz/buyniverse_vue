import React from 'react';
import { Job, ApprovalStatus, JobApprover, User } from '@/types';
import { useAppState } from '@/context/AppStateContext';
import Card from '@/components/ui/Card';
import Tooltip from '@/components/ui/Tooltip';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface ApproverManagerProps {
    project: Job;
    isEditing: boolean;
    onUpdate: (approvers: JobApprover[]) => void;
}

const ApproverManager: React.FC<ApproverManagerProps> = ({ project, isEditing, onUpdate }) => {
    const { users } = useAppState();
    
    const availableUsers = users.filter(u => !project.approvers.some(a => a.userId === u.id));

    const handleAddApprover = (userId: string) => {
        if (!userId) return;
        const newApprover: JobApprover = {
            userId,
            level: (project.approvers.length > 0 ? Math.max(...project.approvers.map(a => a.level)) : 0) + 1,
            status: ApprovalStatus.Pending,
            role: 'Approver'
        };
        onUpdate([...project.approvers, newApprover]);
    };

    const handleRemoveApprover = (userId: string) => {
        onUpdate(project.approvers.filter(a => a.userId !== userId));
    };
    
    const handleUpdateApprover = (userId: string, key: keyof JobApprover, value: any) => {
        onUpdate(project.approvers.map(a => a.userId === userId ? { ...a, [key]: value } : a));
    };

    const getStatusIcon = (status: ApprovalStatus) => {
        switch (status) {
            case ApprovalStatus.Approved:
                return <Tooltip content="Approved"><i className="fa-solid fa-circle-check text-green-500"></i></Tooltip>;
            case ApprovalStatus.Rejected:
                return <Tooltip content="Rejected"><i className="fa-solid fa-circle-xmark text-red-500"></i></Tooltip>;
            case ApprovalStatus.Pending:
            default:
                return <Tooltip content="Pending"><i className="fa-solid fa-circle-pause text-yellow-500"></i></Tooltip>;
        }
    };

    if(isEditing) {
        return (
            <Card className="p-6">
                <h3 className="text-xl font-bold mb-4">Approval Workflow</h3>
                 <div className="space-y-2 mb-4">
                    {project.approvers.sort((a, b) => a.level - b.level).map(approver => {
                        const user = users.find(u => u.id === approver.userId);
                        if (!user) return null;
                        return (
                            <div key={user.id} className="flex items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                <Input type="number" value={approver.level} onChange={e => handleUpdateApprover(user.id, 'level', Number(e.target.value))} className="w-14 text-xs !py-1"/>
                                <img src={user?.avatarUrl} className="w-8 h-8 rounded-full" loading="lazy" decoding="async" />
                                <strong className="flex-grow">{user?.name}</strong>
                                <Input value={approver.role} onChange={e => handleUpdateApprover(user.id, 'role', e.target.value)} className="w-24 text-xs !py-1"/>
                                <Button size="sm" variant="danger" onClick={() => handleRemoveApprover(user.id)} className="!p-1 h-6 w-6 shrink-0"><i className="fa-solid fa-times"></i></Button>
                            </div>
                        );
                    })}
                </div>
                <div className="flex gap-2">
                     <select onChange={e => handleAddApprover(e.target.value)} defaultValue="" className="block w-full px-2 py-2 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm">
                        <option value="">Add approver...</option>
                        {availableUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                     </select>
                </div>
            </Card>
        )
    }

    return (
        <Card className="p-6">
            <h3 className="text-xl font-bold mb-4">Approval Workflow</h3>
            <div className="space-y-3">
                {project.approvers.sort((a, b) => a.level - b.level).map(approver => {
                    const user = users.find(u => u.id === approver.userId);
                    if (!user) return null;
                    return (
                        <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-lg text-slate-400 w-6 text-center">{approver.level}</span>
                                <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full" loading="lazy" decoding="async" />
                                <div>
                                    <p className="font-semibold">{user.name}</p>
                                    <p className="text-sm text-slate-500">{approver.role}</p>
                                </div>
                            </div>
                            <div className="text-xl">
                                {getStatusIcon(approver.status)}
                            </div>
                        </div>
                    );
                })}
                {project.approvers.length === 0 && <p className="text-sm text-center text-slate-500">No approval workflow configured.</p>}
            </div>
        </Card>
    );
};

export default ApproverManager;