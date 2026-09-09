import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { Job, JobStatus, User, JobApprover, ApprovalStatus, TeamMember, File as ProjectFile, FileCategory, ProjectLevel, Duration, SourcingType } from '@/types';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import { generateJobDetailsWithAI, refineJobDescriptionWithAI } from '@/services/geminiService';
import Spinner from '@/components/ui/Spinner';
import TagInput from '@/components/ui/TagInput';
import ButtonGroup from '@/components/ui/ButtonGroup';

const StepIndicator: React.FC<{ currentStep: number; totalSteps: number; }> = ({ currentStep, totalSteps }) => (
    <div className="flex justify-center items-center gap-2 mb-6">
        {[...Array(totalSteps)].map((_, i) => (
            <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${i + 1 === currentStep ? 'bg-primary-600 border-primary-600 text-white' : i + 1 < currentStep ? 'bg-green-500 border-green-500 text-white' : 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-500'}`}>
                {i + 1 < currentStep ? <i className="fa-solid fa-check"></i> : i + 1}
            </div>
        ))}
    </div>
);

const ProjectCreationWizard: React.FC<{ draftJob: Job }> = ({ draftJob }) => {
    const { currentUser, users } = useAppState();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const debounceTimeout = useRef<number | null>(null);
    const descriptionRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isEditingDraft = !!(draftJob && draftJob.title && draftJob.description);
    
    const [project, setProject] = useState<Partial<Job>>(() => {
        const initialProject = { ...draftJob };
        if (!initialProject.currency && currentUser.defaultCurrency) {
            initialProject.currency = currentUser.defaultCurrency;
        }
        return initialProject;
    });

    const totalSteps = project.sourcingType === SourcingType.RFI ? 2 : 5;
    const [step, setStep] = useState(() => {
        if (project.sourcingType === SourcingType.RFP) return isEditingDraft ? 2 : 1;
        if (project.sourcingType === SourcingType.RFI) return isEditingDraft ? 2 : 1;
        return 0; // Start at sourcing type selection if not set
    });

    const [aiPrompt, setAiPrompt] = useState('');
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [aiError, setAiError] = useState('');
    const [refinePrompt, setRefinePrompt] = useState('');
    const [isRefining, setIsRefining] = useState(false);

    const debouncedSave = useCallback((updatedProject: Partial<Job>) => {
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }
        debounceTimeout.current = window.setTimeout(() => {
            dispatch({ type: 'UPDATE_JOB_DRAFT', payload: { jobId: updatedProject.id!, data: updatedProject } });
        }, 1000);
    }, [dispatch]);

    useEffect(() => {
        if (project.id) {
            debouncedSave(project);
        }
    }, [project, debouncedSave]);
    
     const updateProject = (updates: Partial<Job>) => {
        setProject(prev => ({...prev, ...updates}));
    }

    const handleSourcingTypeSelect = (type: SourcingType) => {
        updateProject({ sourcingType: type });
        setStep(1);
    };

    const handleGenerate = async () => {
        if (!aiPrompt.trim()) return;
        setIsLoadingAI(true);
        setAiError('');
        try {
            const details = await generateJobDetailsWithAI(aiPrompt);
            updateProject(details);
            setStep(2);
        } catch (e: any) {
            setAiError(e.message);
        } finally {
            setIsLoadingAI(false);
        }
    };
    
    const handleRefineDescription = async () => {
        if (!refinePrompt.trim() || !project.description) return;
        setIsRefining(true);

        const selection = descriptionRef.current && descriptionRef.current.selectionStart !== descriptionRef.current.selectionEnd
            ? descriptionRef.current.value.substring(descriptionRef.current.selectionStart, descriptionRef.current.selectionEnd)
            : undefined;

        try {
            const newDescription = await refineJobDescriptionWithAI(project.description, refinePrompt, selection);
            updateProject({ description: newDescription });
            setRefinePrompt('');
        } catch (e) {
            alert(t('pages.project.wizard.refine.error'));
        } finally {
            setIsRefining(false);
        }
    };
    
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const newFile: ProjectFile = {
            id: `file-${Date.now()}`, name: file.name, path: '/', size: file.size, type: file.type,
            uploadedAt: new Date(), uploadedById: currentUser.id, status: 'Modified',
            category: FileCategory.Documentation,
        };
        updateProject({ files: [...(project.files || []), newFile] });
        event.target.value = '';
    };

    const nextStep = () => setStep(s => Math.min(s + 1, totalSteps));
    const prevStep = () => setStep(s => Math.max(s - 1, 0));

    const finishWizard = () => {
        navigate(`/project/${project.id}`);
    };

    const isStep2Valid = useMemo(() => {
        return project.title && project.description && project.skills?.length && project.budget?.amount && project.currency && project.projectLevel && project.duration;
    }, [project]);
    
    const isRfiStep2Valid = useMemo(() => {
        return project.title && project.description;
    }, [project]);
    
    const getStepTitle = (currentStep: number) => {
        if (project.sourcingType === SourcingType.RFI) {
             switch(currentStep) {
                case 1: return { title: t('pages.project.wizard.step1.title'), subtitle: t('pages.project.wizard.step1.subtitle') };
                case 2: return { title: t('pages.project.wizard.step2.title'), subtitle: "Refine the core problem statement you want providers to address." };
                default: return { title: '', subtitle: ''};
            }
        }
        // RFP flow
        switch(currentStep) {
            case 1: return { title: t('pages.project.wizard.step1.title'), subtitle: t('pages.project.wizard.step1.subtitle') };
            case 2: return { title: t('pages.project.wizard.step2.title'), subtitle: t('pages.project.wizard.step2.subtitle') };
            case 3: return { title: t('pages.project.wizard.step3.title'), subtitle: t('pages.project.wizard.step3.subtitle') };
            case 4: return { title: t('pages.project.wizard.step4.title'), subtitle: t('pages.project.wizard.step4.subtitle') };
            case 5: return { title: t('pages.project.wizard.step5.title'), subtitle: t('pages.project.wizard.step5.subtitle') };
            default: return { title: '', subtitle: ''};
        }
    };
    
    const currentStepInfo = getStepTitle(step);

    const availableUsersForTeam = users.filter(u => !(project.team || []).some(m => m.userId === u.id));
    const availableUsersForApprovers = users.filter(u => !(project.approvers || []).some(a => a.userId === u.id));

    const durationOptions = [
        { value: Duration.LessThan1Month, key: 'lessThan1Month' },
        { value: Duration.Month1To3, key: 'month1To3' },
        { value: Duration.Month3To6, key: 'month3To6' },
        { value: Duration.MoreThan6Months, key: 'moreThan6Months' },
    ];

    const renderStepContent = () => {
        switch (step) {
            case 0:
                return (
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-2">{t('pages.job.post.sourcingType.title')}</h2>
                        <div className="flex flex-col md:flex-row gap-4 max-w-2xl mx-auto mt-6">
                            <Card onClick={() => handleSourcingTypeSelect(SourcingType.RFI)} className="p-6 text-left cursor-pointer hover:border-primary-500 hover:ring-2 hover:ring-primary-500/50 flex-1">
                                <h3 className="font-bold text-lg">{t('pages.job.post.sourcingType.rfi.title')}</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{t('pages.job.post.sourcingType.rfi.description')}</p>
                            </Card>
                             <Card onClick={() => handleSourcingTypeSelect(SourcingType.RFP)} className="p-6 text-left cursor-pointer hover:border-primary-500 hover:ring-2 hover:ring-primary-500/50 flex-1">
                                <h3 className="font-bold text-lg">{t('pages.job.post.sourcingType.rfp.title')}</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{t('pages.job.post.sourcingType.rfp.description')}</p>
                            </Card>
                        </div>
                    </div>
                )
            case 1:
                return (
                    <div className="max-w-2xl mx-auto">
                        <Textarea label={t('pages.project.wizard.ai.placeholder')} value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} rows={5} />
                        <div className="mt-4 flex justify-end gap-2">
                             <Button onClick={() => setStep(2)} variant="secondary">{t('pages.project.wizard.ai.skip')}</Button>
                             <Button onClick={handleGenerate} disabled={isLoadingAI}>
                                {isLoadingAI ? <Spinner size="sm" /> : <>{t('pages.project.wizard.ai.generate')}</>}
                            </Button>
                        </div>
                        {aiError && <p className="text-red-500 text-sm mt-2">{aiError}</p>}
                    </div>
                )
            case 2:
                return (
                    <div className="space-y-6">
                         <Input label={t('pages.project.wizard.details.title')} value={project.title || ''} onChange={e => updateProject({title: e.target.value})} placeholder={t('pages.project.wizard.details.titlePlaceholder')} />
                         <div>
                            <Textarea ref={descriptionRef} label={t('pages.project.wizard.details.description')} value={project.description || ''} onChange={e => updateProject({description: e.target.value})} rows={10} placeholder={t('pages.project.wizard.details.descriptionPlaceholder')} />
                            <div className="p-3 bg-slate-100 dark:bg-slate-700/50 rounded-b-lg border-t border-slate-200 dark:border-slate-600">
                                <h4 className="font-semibold text-sm mb-1">{t('pages.project.wizard.refine.title')}</h4>
                                <p className="text-xs text-slate-500 mb-2">{t('pages.project.wizard.refine.tip')}</p>
                                <div className="flex gap-2">
                                    <Input wrapperClassName="flex-grow" value={refinePrompt} onChange={e => setRefinePrompt(e.target.value)} placeholder={t('pages.project.wizard.refine.promptPlaceholder')} disabled={isRefining} />
                                    <Button onClick={handleRefineDescription} disabled={isRefining}>
                                        {isRefining ? <Spinner size="sm" /> : t('pages.project.wizard.refine.button')}
                                    </Button>
                                </div>
                            </div>
                         </div>

                        {project.sourcingType === SourcingType.RFP && (
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                {/* Details for RFP */}
                                <Input label={t('pages.project.wizard.details.budget')} type="number" value={project.budget?.amount || ''} onChange={e => updateProject({budget: {...project.budget, amount: Number(e.target.value)}})} placeholder={t('pages.project.wizard.details.budgetPlaceholder')} />
                                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('pages.project.wizard.details.projectLevel')}</label><select value={project.projectLevel || ''} onChange={e => updateProject({ projectLevel: e.target.value as ProjectLevel })} className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"><option value="" disabled>{t('pages.project.wizard.details.projectLevels.basic')}</option>{Object.values(ProjectLevel).map(v => <option key={v} value={v}>{t(`pages.project.wizard.details.projectLevels.${(v as string).toLowerCase()}`)}</option>)}</select></div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('pages.project.wizard.details.duration')}</label>
                                    <select value={project.duration || ''} onChange={e => updateProject({ duration: e.target.value as Duration })} className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600">
                                        <option value="" disabled>{t('pages.project.wizard.details.durations.select')}</option>
                                        {durationOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>
                                                {t(`pages.project.wizard.details.durations.${opt.key}`)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <Input type="date" label={t('pages.project.wizard.details.hiringLimit')} value={project.hiringLimitDate ? new Date(project.hiringLimitDate).toISOString().split('T')[0] : ''} onChange={e => updateProject({hiringLimitDate: new Date(e.target.value)})} />
                                <Input type="date" label={t('pages.project.wizard.details.deadline')} value={project.dueDate ? new Date(project.dueDate).toISOString().split('T')[0] : ''} onChange={e => updateProject({dueDate: new Date(e.target.value)})} />
                                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('pages.project.wizard.details.visibility')}</label><ButtonGroup options={[{label: t('pages.project.wizard.details.public'), value: 'public'}, {label: t('pages.project.wizard.details.private'), value: 'private'}]} selectedValue={project.visibility || 'private'} onSelectionChange={v => updateProject({visibility: v as 'public' | 'private'})} /></div>
                                <div className="md:col-span-3"><TagInput label={t('pages.project.wizard.details.skills')} tags={project.skills || []} onTagsChange={tags => updateProject({skills: tags})} placeholder={t('pages.project.wizard.details.tagPlaceholder')} /></div>
                            </div>
                        )}
                    </div>
                )
             case 3: // File Uploads
                return (
                    <div className="max-w-3xl mx-auto">
                        <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer text-center border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-12 hover:border-primary-500">
                            <i className="fa-solid fa-cloud-arrow-up text-4xl text-slate-400"></i>
                            <p className="mt-2 text-sm text-slate-500">{t('pages.project.wizard.files.upload')}</p>
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                        <div className="mt-4 space-y-2">
                            {(project.files || []).map(file => (
                                <div key={file.id} className="flex items-center gap-3 p-2 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                                    <i className="fa-solid fa-file text-slate-500"></i>
                                    <span className="flex-grow font-medium text-sm">{file.name}</span>
                                    <span className="text-xs text-slate-500">{Math.round(file.size / 1024)} {t('pages.project.wizard.files.sizeUnit')}</span>
                                    <select value={file.category} onChange={e => updateProject({ files: project.files?.map(f => f.id === file.id ? {...f, category: e.target.value as FileCategory} : f)})} className="text-xs rounded dark:bg-slate-600 border-slate-300 dark:border-slate-500">
                                        {Object.values(FileCategory).map(cat => <option key={cat} value={cat}>{t(`pages.project.wizard.files.categories.${(cat as string).toLowerCase()}`)}</option>)}
                                    </select>
                                    <Button size="sm" variant="danger" onClick={() => updateProject({ files: project.files?.filter(f => f.id !== file.id) })} className="!p-1 h-6 w-6 shrink-0"><i className="fa-solid fa-times"></i></Button>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 4: // Team
                return (
                     <div className="max-w-2xl mx-auto space-y-2">
                        <div className="flex items-center gap-2 px-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <div className="w-8 shrink-0" /> {/* Avatar placeholder */}
                            <div className="flex-grow">{t('pages.project.wizard.team.headerUser')}</div>
                            <div className="w-32 shrink-0 text-center">{t('pages.project.wizard.team.headerRole')}</div>
                            <div className="w-24 shrink-0 text-center">{t('pages.project.wizard.team.headerPermissions')}</div>
                            <div className="w-6 shrink-0" /> {/* Remove button placeholder */}
                        </div>
                        {(project.team || []).map(member => {
                            const user = users.find(u => u.id === member.userId);
                            return (
                                <div key={member.userId} className="flex items-center gap-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-700/50">
                                    <img src={user?.avatarUrl} className="w-8 h-8 rounded-full" />
                                    <strong className="flex-grow">{user?.name}</strong>
                                    <Input value={member.role} onChange={e => updateProject({ team: project.team?.map(m => m.userId === member.userId ? {...m, role: e.target.value} : m)})} placeholder={t('pages.project.wizard.team.rolePlaceholder')} className="w-32 !py-1 text-sm"/>
                                    <select value={member.permission} onChange={e => updateProject({ team: project.team?.map(m => m.userId === member.userId ? {...m, permission: e.target.value as 'view' | 'edit'} : m)})} className="w-24 text-sm rounded !py-1 dark:bg-slate-600 border-slate-300 dark:border-slate-500">
                                        <option value="view">{t('pages.project.wizard.team.view')}</option>
                                        <option value="edit">{t('pages.project.wizard.team.edit')}</option>
                                    </select>
                                     <Button size="sm" variant="danger" onClick={() => updateProject({ team: project.team?.filter(m => m.userId !== member.userId)})} className="!p-1 h-6 w-6 shrink-0"><i className="fa-solid fa-times"></i></Button>
                                </div>
                            )
                        })}
                        <select onChange={e => updateProject({ team: [...(project.team || []), { userId: e.target.value, permission: 'view', role: t('pages.project.wizard.team.defaultRole') }]})} value="" className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 mt-4">
                            <option value="">{t('pages.project.wizard.team.select')}</option>
                            {availableUsersForTeam.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                     </div>
                );
            case 5: // Approvers
                 return (
                     <div className="max-w-2xl mx-auto space-y-2">
                        <div className="flex items-center gap-2 px-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <div className="w-12 shrink-0 text-center">{t('pages.project.wizard.approvers.headerLevel')}</div>
                            <div className="w-8 shrink-0" /> {/* Avatar placeholder */}
                            <div className="flex-grow">{t('pages.project.wizard.approvers.headerUser')}</div>
                            <div className="w-32 shrink-0 text-center">{t('pages.project.wizard.approvers.headerRole')}</div>
                            <div className="w-6 shrink-0" /> {/* Remove button placeholder */}
                        </div>
                        {(project.approvers || []).sort((a,b) => a.level - b.level).map(approver => {
                            const user = users.find(u => u.id === approver.userId);
                            return (
                                <div key={approver.userId} className="flex items-center gap-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-700/50">
                                    <Input type="number" value={approver.level} onChange={e => updateProject({ approvers: project.approvers?.map(a => a.userId === approver.userId ? {...a, level: Number(e.target.value)} : a) })} className="w-12 !py-1 text-sm" />
                                    <img src={user?.avatarUrl} className="w-8 h-8 rounded-full" />
                                    <strong className="flex-grow">{user?.name}</strong>
                                    <Input value={approver.role} onChange={e => updateProject({ approvers: project.approvers?.map(a => a.userId === approver.userId ? {...a, role: e.target.value} : a)})} placeholder={t('pages.project.wizard.approvers.role')} className="w-32 !py-1 text-sm"/>
                                     <Button size="sm" variant="danger" onClick={() => updateProject({ approvers: project.approvers?.filter(a => a.userId !== approver.userId)})} className="!p-1 h-6 w-6 shrink-0"><i className="fa-solid fa-times"></i></Button>
                                </div>
                            )
                        })}
                        <select onChange={e => updateProject({ approvers: [...(project.approvers || []), { userId: e.target.value, level: (project.approvers?.length || 0) + 1, status: ApprovalStatus.Pending, role: t('pages.project.wizard.approvers.defaultRole') }]})} value="" className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 mt-4">
                            <option value="">{t('pages.project.wizard.approvers.select')}</option>
                            {availableUsersForApprovers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                     </div>
                );
            default:
                return null;
        }
    };

    return (
        <Card className="p-6 max-w-4xl mx-auto">
            {step > 0 && <StepIndicator currentStep={step} totalSteps={totalSteps} />}
            <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold">{currentStepInfo.title}</h2>
                <p className="text-slate-500">{currentStepInfo.subtitle}</p>
            </div>
            
            <div className="min-h-[300px]">
                {renderStepContent()}
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <div>
                    {step > (project.sourcingType ? 1 : 0) && <Button type="button" variant="secondary" onClick={prevStep}>{t('pages.project.wizard.nav.back')}</Button>}
                </div>
                <div className="flex items-center gap-4">
                    {step < totalSteps && <Button type="button" onClick={nextStep} disabled={ (step === 2 && project.sourcingType === SourcingType.RFP && !isStep2Valid) || (step === 2 && project.sourcingType === SourcingType.RFI && !isRfiStep2Valid) }>{t('pages.project.wizard.nav.next')}</Button>}
                    {step === totalSteps && <Button type="button" onClick={finishWizard}>{t('pages.project.wizard.finish')}</Button>}
                </div>
            </div>
        </Card>
    );
};

export default ProjectCreationWizard;