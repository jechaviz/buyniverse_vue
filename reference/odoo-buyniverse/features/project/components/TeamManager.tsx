import React from 'react';
import { Job, TeamMember, User } from '@/types';
import { useAppState } from '@/context/AppStateContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface TeamManagerProps {
    project: Job;
    isEditing: boolean;
    onUpdate: (team: TeamMember[]) => void;
}

const TeamManager: React.FC<TeamManagerProps> = ({ project, isEditing, onUpdate }) => {
    const { users } = useAppState();
    
    const availableUsers = users.filter(u => !(project.team || []).some(m => m.userId === u.id));

    const handleAddMember = (userId: string) => {
        if (!userId) return;
        const newMember: TeamMember = { userId, permission: 'view', role: 'Member' };
        const newTeam = [...(project.team || []), newMember];
        onUpdate(newTeam);
    };

    const handleRemoveMember = (userId: string) => {
        const newTeam = (project.team || []).filter(m => m.userId !== userId);
        onUpdate(newTeam);
    };
    
    const handleUpdateMember = (userId: string, updates: Partial<TeamMember>) => {
        const newTeam = (project.team || []).map(m => m.userId === userId ? { ...m, ...updates } : m);
        onUpdate(newTeam as TeamMember[]);
    };

    if (isEditing) {
        return (
             <Card className="p-6">
                <h3 className="text-xl font-bold mb-4">Project Team</h3>
                <div className="space-y-2 mb-4">
                    {(project.team || []).map(member => {
                        const user = users.find(u => u.id === member.userId);
                        if (!user) return null;
                        return (
                            <div key={user.id} className="flex items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                <img src={user?.avatarUrl} className="w-8 h-8 rounded-full" loading="lazy" decoding="async" />
                                <strong className="flex-grow">{user?.name}</strong>
                                <Input value={member.role} onChange={e => handleUpdateMember(user.id, { role: e.target.value })} className="w-24 text-xs !py-1"/>
                                <select 
                                    value={member.permission} 
                                    onChange={(e) => {
                                        handleUpdateMember(user.id, { permission: e.target.value as 'view' | 'edit' });
                                    }} 
                                    className="text-xs rounded-md !py-1 dark:bg-slate-600 border-slate-300 dark:border-slate-500"
                                >
                                    <option value="view">View</option>
                                    <option value="edit">Edit</option>
                                </select>
                                <Button size="sm" variant="danger" onClick={() => handleRemoveMember(user.id)} className="!p-1 h-6 w-6 shrink-0"><i className="fa-solid fa-times"></i></Button>
                            </div>
                        );
                    })}
                </div>
                 <div className="flex gap-2">
                     <select onChange={e => handleAddMember(e.target.value)} defaultValue="" className="block w-full px-2 py-2 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm">
                        <option value="">Add member...</option>
                        {availableUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                     </select>
                </div>
            </Card>
        )
    }

    return (
        <Card className="p-6">
            <h3 className="text-xl font-bold mb-4">Project Team</h3>
            <div className="space-y-3">
                {project.team.map(member => {
                    const user = users.find(u => u.id === member.userId);
                    if (!user) return null;
                    return (
                        <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full" loading="lazy" decoding="async" />
                                <div>
                                    <p className="font-semibold">{user.name}</p>
                                    <p className="text-sm text-slate-500">{member.role}</p>
                                </div>
                            </div>
                            <span className="text-xs font-semibold uppercase text-slate-400">{member.permission}</span>
                        </div>
                    );
                })}
                 {project.team.length === 0 && <p className="text-sm text-center text-slate-500">No team members assigned.</p>}
            </div>
        </Card>
    );
};

export default TeamManager;