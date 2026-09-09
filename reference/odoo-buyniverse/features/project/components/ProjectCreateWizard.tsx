import React, { useState } from 'react';
import { Job, JobStatus, User, JobApprover, ApprovalStatus, TeamMember } from '@/types';
import { useAppState } from '@/context/AppStateContext';
import { useTranslation } from '@/hooks/useTranslation';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';

interface ProjectCreateWizardProps {
    onSave: (project: Job) => void;
    onCancel: () => void;
}

const ProjectCreateWizard: React.FC<ProjectCreateWizardProps> = ({ onSave, onCancel }) => {
    const { currentUser } = useAppState();
    const { t } = useTranslation();
    const [step, setStep] = useState(1);
    const [project, setProject] = useState<Partial<Job>>({
        id: `job-${Date.now()}`,
        clientId: currentUser.id,
        status: JobStatus.Draft,
        approvers: [],
        team: [],
        proposals: [],
        questions: [],
        skills: [],
        postedAt: new Date(),
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setProject(prev => ({ ...prev, [name]: value }));
    };
    
    const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProject({ ...project, budget: { ...project.budget, [e.target.name]: e.target.value } });
    }

    const handleSkillsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProject({ ...project, skills: e.target.value.split(',').map(s => s.trim()) });
    };

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    const handleSave = () => {
        const finalProject = {
            ...project,
            status: (project.approvers || []).length > 0 ? JobStatus.PendingApproval : JobStatus.Open,
        }
        onSave(finalProject as Job);
    }
    
    const isStep1Valid = project.title && project.description;
    const isStep2Valid = project.skills?.length && project.budget?.amount && project.experienceLevel;

    return (
        <Card className="p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold">Create New Project (Step {step}/3)</h2>
                {/* Progress Bar */}
                <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-primary-600 h-2 rounded-full" style={{ width: `${(step/3)*100}%`}}></div>
                </div>
            </div>

            {step === 1 && (
                <div className="space-y-4 animate-fade-in">
                    <h3 className="font-semibold text-lg">Basic Information</h3>
                    <Input label="Project Title" name="title" value={project.title || ''} onChange={handleChange} required />
                    <Textarea label="Project Description" name="description" value={project.description || ''} onChange={handleChange} rows={6} required />
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4 animate-fade-in">
                    <h3 className="font-semibold text-lg">Details & Budget</h3>
                    <Input label="Skills (comma-separated)" name="skills" value={project.skills?.join(', ') || ''} onChange={handleSkillsChange} required />
                     <div>
                         <div className="flex gap-4 mb-2">
                            <label className="flex items-center gap-2"><input type="radio" name="type" value="Fixed-Price" checked={project.budget?.type === 'Fixed-Price'} onChange={handleBudgetChange} className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"/>Fixed-Price</label>
                            <label className="flex items-center gap-2"><input type="radio" name="type" value="Hourly" checked={project.budget?.type === 'Hourly'} onChange={handleBudgetChange} className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"/>Hourly</label>
                        </div>
                        <Input name="amount" type="number" value={project.budget?.amount || ''} onChange={handleBudgetChange} 
                               label={project.budget?.type === 'Hourly' ? 'Hourly Rate' : 'Project Budget'}
                               required />
                    </div>
                     <select name="experienceLevel" value={project.experienceLevel || ''} onChange={handleChange} required className="block w-full px-4 py-2 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm">
                        <option value="" disabled>Select experience level...</option>
                        <option value="Entry">Entry</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Expert">Expert</option>
                    </select>
                </div>
            )}
            
            {step === 3 && (
                 <div className="space-y-4 animate-fade-in">
                    <h3 className="font-semibold text-lg">Team & Approvers (Optional)</h3>
                    <p className="text-sm text-slate-500">You can set up team members and an approval workflow for this project.</p>
                    {/* Simplified for wizard context. Full manager could be here */}
                </div>
            )}

            <div className="mt-8 flex justify-between items-center">
                <div>
                    {step > 1 && <Button type="button" variant="secondary" onClick={prevStep}>Back</Button>}
                </div>
                 <div className="flex items-center gap-4">
                    <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
                    {step < 3 && <Button type="button" onClick={nextStep} disabled={ (step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid) }>Next</Button>}
                    {step === 3 && <Button type="button" onClick={handleSave}>Create Project</Button>}
                </div>
            </div>
        </Card>
    );
}

export default ProjectCreateWizard;
