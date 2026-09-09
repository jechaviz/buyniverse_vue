import React, { useState, useEffect, useRef } from 'react';
import { Job, FileCategory, ProjectLevel, Duration, JobStatus, TeamMember, JobApprover } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import Card from '@/components/ui/Card';
import Tag from '@/components/ui/Tag';
import TeamManager from './TeamManager';
import ApproverManager from './ApproverManager';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import TagInput from '@/components/ui/TagInput';
import ButtonGroup from '@/components/ui/ButtonGroup';
import { refineJobDescriptionWithAI } from '@/services/geminiService';
import Spinner from '@/components/ui/Spinner';

interface ProjectInfoDisplayProps {
  project: Job;
  onNavigate: (tab: string, fileId?: string) => void;
  onUpdate: (updates: Partial<Job>) => void;
}

const InfoItem: React.FC<{ label: string, children: React.ReactNode}> = ({ label, children }) => (
    <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <div className="text-md font-semibold text-slate-700 dark:text-slate-200 mt-1 break-words">{children}</div>
    </div>
);

const ProjectInfoDisplay: React.FC<ProjectInfoDisplayProps> = ({ project, onNavigate, onUpdate }) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editedProject, setEditedProject] = useState<Partial<Job>>(project);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [showReadMore, setShowReadMore] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const descriptionEditorRef = useRef<HTMLTextAreaElement>(null);

  const [refinePrompt, setRefinePrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  useEffect(() => {
    if (descriptionRef.current) {
      setShowReadMore(descriptionRef.current.scrollHeight > descriptionRef.current.clientHeight);
    }
  }, [project.description, isDescriptionExpanded]);
  
  useEffect(() => {
      setEditedProject(project);
  }, [project]);

  const handleUpdate = (field: keyof Job, value: any) => {
    setEditedProject(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSave = () => {
      onUpdate(editedProject);
      setIsEditing(false);
  }
  
  const handleCancel = () => {
      setEditedProject(project);
      setIsEditing(false);
  }

  const handleRefineDescription = async () => {
    if (!refinePrompt.trim() || !editedProject.description) return;
    setIsRefining(true);

    const selection = descriptionEditorRef.current && descriptionEditorRef.current.selectionStart !== descriptionEditorRef.current.selectionEnd
        ? descriptionEditorRef.current.value.substring(descriptionEditorRef.current.selectionStart, descriptionEditorRef.current.selectionEnd)
        : undefined;

    try {
        const newDescription = await refineJobDescriptionWithAI(editedProject.description, refinePrompt, selection);
        handleUpdate('description', newDescription);
        setRefinePrompt('');
    } catch (e) {
        alert(t('pages.project.details.refine.error'));
    } finally {
        setIsRefining(false);
    }
  };

  const keyFiles = project.files?.filter(f => f.category === FileCategory.Contract || f.category === FileCategory.Brief) || [];
  
  const formatDateForInput = (date?: Date): string => {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  }

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">{t('pages.project.details.details')}</h3>
            <div className="flex items-center gap-2">
                {isEditing ? (
                    <>
                        <Button variant="secondary" onClick={handleCancel}>{t('pages.project.details.cancel')}</Button>
                        <Button onClick={handleSave}>{t('pages.project.details.saveChanges')}</Button>
                    </>
                ) : (
                    <Button variant="outline" onClick={() => setIsEditing(true)}>{t('pages.project.details.editProject')}</Button>
                )}
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <Card className="p-6">
                    <h3 className="text-xl font-bold mb-2">{t('pages.job.post.jobDescription')}</h3>
                    {isEditing ? (
                        <div>
                            <Textarea ref={descriptionEditorRef} value={editedProject.description || ''} onChange={(e) => handleUpdate('description', e.target.value)} rows={8} />
                            <div className="p-3 bg-slate-100 dark:bg-slate-700/50 rounded-b-lg border-t border-slate-200 dark:border-slate-600">
                                <h4 className="font-semibold text-sm mb-1">{t('pages.project.details.refine.title')}</h4>
                                <p className="text-xs text-slate-500 mb-2">{t('pages.project.details.refine.tip')}</p>
                                <div className="flex gap-2">
                                    <Input wrapperClassName="flex-grow" value={refinePrompt} onChange={e => setRefinePrompt(e.target.value)} placeholder={t('pages.project.details.refine.promptPlaceholder')} disabled={isRefining} />
                                    <Button onClick={handleRefineDescription} disabled={isRefining}>
                                        {isRefining ? <Spinner size="sm" /> : t('pages.project.details.refine.button')}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <p ref={descriptionRef} className={`text-slate-600 dark:text-slate-300 whitespace-pre-wrap ${!isDescriptionExpanded ? 'line-clamp-3' : ''}`}>
                                {project.description}
                            </p>
                            {showReadMore && (
                                <button onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)} className="text-primary-600 text-sm font-semibold mt-2">
                                    {isDescriptionExpanded ? t('pages.project.details.readLess') : t('pages.project.details.readMore')}
                                </button>
                            )}
                        </>
                    )}
                </Card>
                <Card className="p-6">
                     <h3 className="text-xl font-bold mb-4">{t('pages.project.details.details')}</h3>
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        {isEditing ? (
                            <>
                                <div><label className="text-sm text-slate-500">{t('pages.project.details.status')}</label><select value={editedProject.status} onChange={e => handleUpdate('status', e.target.value as JobStatus)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-slate-700 dark:border-slate-600">{Object.values(JobStatus).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                                <div><label className="text-sm text-slate-500">{t('pages.project.details.projectLevel')}</label><select value={editedProject.projectLevel} onChange={e => handleUpdate('projectLevel', e.target.value as ProjectLevel)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-slate-700 dark:border-slate-600">{Object.values(ProjectLevel).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                                <div><label className="text-sm text-slate-500">{t('pages.project.details.duration')}</label><select value={editedProject.duration} onChange={e => handleUpdate('duration', e.target.value as Duration)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-slate-700 dark:border-slate-600">{Object.values(Duration).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                                <Input label={t('pages.project.details.budget')} type="number" value={editedProject.budget?.amount || 0} onChange={e => handleUpdate('budget', { ...editedProject.budget, amount: Number(e.target.value)})} />
                                <Input label={t('pages.project.details.category')} value={editedProject.category || ''} onChange={e => handleUpdate('category', e.target.value)} />
                                <Input label={t('pages.project.details.hiringLimitDate')} type="date" value={formatDateForInput(editedProject.hiringLimitDate)} onChange={e => handleUpdate('hiringLimitDate', new Date(e.target.value))} />
                                <Input label={t('pages.project.details.dueDate')} type="date" value={formatDateForInput(editedProject.dueDate)} onChange={e => handleUpdate('dueDate', new Date(e.target.value))} />
                                <div className="md:col-span-3">
                                    <TagInput label={t('pages.job.post.skills')} tags={editedProject.skills || []} onTagsChange={tags => handleUpdate('skills', tags)} />
                                </div>
                            </>
                        ) : (
                            <>
                                <InfoItem label={t('pages.project.details.status')}>{project.status.replace('_', ' ')}</InfoItem>
                                <InfoItem label={t('pages.project.details.projectLevel')}>{project.projectLevel}</InfoItem>
                                <InfoItem label={t('pages.project.details.duration')}>{project.duration}</InfoItem>
                                <InfoItem label={t('pages.project.details.budget')}>{project.currency} {project.budget.amount.toLocaleString()}</InfoItem>
                                <InfoItem label={t('pages.project.details.category')}>{project.category}</InfoItem>
                                <InfoItem label={t('pages.project.details.hiringLimitDate')}>{project.hiringLimitDate ? new Date(project.hiringLimitDate).toLocaleDateString() : 'N/A'}</InfoItem>
                                <InfoItem label={t('pages.project.details.dueDate')}>{project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'N/A'}</InfoItem>
                                <InfoItem label={t('pages.project.details.visibility')}>{project.visibility}</InfoItem>
                                 <div className="md:col-span-3">
                                    <InfoItem label={t('pages.job.post.skills')}>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {project.skills.map(s => <Tag key={s}>{s}</Tag>)}
                                        </div>
                                    </InfoItem>
                                </div>
                            </>
                        )}
                     </div>
                </Card>
                 {keyFiles.length > 0 && !isEditing && (
                    <Card className="p-6">
                        <h3 className="text-xl font-bold mb-4">{t('pages.project.details.files')}</h3>
                        <div className="space-y-2">
                            {keyFiles.map(file => (
                                <button key={file.id} onClick={() => onNavigate('Files', file.id)} className="w-full text-left p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">
                                    <p className="font-semibold text-primary-600">{file.name}</p>
                                    <p className="text-xs text-slate-500">{file.category}</p>
                                </button>
                            ))}
                        </div>
                    </Card>
                 )}
            </div>
            <div className="space-y-6">
                <TeamManager 
                    project={editedProject as Job} 
                    isEditing={isEditing}
                    onUpdate={(team) => handleUpdate('team', team)}
                />
                <ApproverManager 
                    project={editedProject as Job} 
                    isEditing={isEditing}
                    onUpdate={(approvers) => handleUpdate('approvers', approvers)}
                />
            </div>
        </div>
    </div>
  );
};

export default ProjectInfoDisplay;