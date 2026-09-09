
import React, { useState } from 'react';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { Job, Question, UserType } from '@/types';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import { useTranslation } from '@/hooks/useTranslation';

interface QandAProps {
    job: Job;
}

const QandA: React.FC<QandAProps> = ({ job }) => {
    const { currentUser, users } = useAppState();
    const dispatch = useAppDispatch();
    const [newQuestion, setNewQuestion] = useState('');
    const [answerBox, setAnswerBox] = useState<{ [key: string]: string }>({});
    const { t } = useTranslation();

    const isClientOwner = currentUser.id === job.clientId;

    const handlePostQuestion = () => {
        if (!newQuestion.trim()) return;
        const question: Question = {
            id: `q-${Date.now()}`,
            userId: currentUser.id,
            text: newQuestion,
            postedAt: new Date(),
        };
        dispatch({ type: 'POST_QUESTION', payload: { jobId: job.id, question } });
        setNewQuestion('');
    };

    const handlePostAnswer = (questionId: string) => {
        const answerText = answerBox[questionId];
        if (!answerText || !answerText.trim()) return;
        dispatch({ type: 'ANSWER_QUESTION', payload: { jobId: job.id, questionId, answerText } });
        setAnswerBox(prev => ({ ...prev, [questionId]: '' }));
    };

    return (
        <div className="space-y-6">
            {job.questions.length > 0 ? (
                <ul className="space-y-6">
                    {job.questions.map(q => {
                        const asker = users.find(u => u.id === q.userId);
                        return (
                            <li key={q.id} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                <p className="text-sm text-slate-800 dark:text-slate-200">{q.text}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                    Asked by {asker?.name} on {new Date(q.postedAt).toLocaleDateString()}
                                </p>
                                {q.answer ? (
                                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                                        <p className="font-semibold text-sm text-primary-700 dark:text-primary-300">{t('pages.job.qanda.clientsAnswer')}</p>
                                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{q.answer.text}</p>
                                    </div>
                                ) : (
                                    isClientOwner && (
                                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                                            <Textarea 
                                                value={answerBox[q.id] || ''}
                                                onChange={e => setAnswerBox(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                placeholder={`Answer ${asker?.name}'s question...`}
                                                rows={2}
                                            />
                                            <div className="text-right mt-2">
                                                <Button size="sm" onClick={() => handlePostAnswer(q.id)}>{t('pages.job.qanda.postAnswer')}</Button>
                                            </div>
                                        </div>
                                    )
                                )}
                            </li>
                        )
                    })}
                </ul>
            ) : (
                <p className="text-center text-slate-500 dark:text-slate-400 py-4">{t('pages.job.qanda.empty')}</p>
            )}

            {currentUser.type === UserType.Freelancer && !isClientOwner && (
                <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                    <h4 className="font-semibold mb-2">{t('pages.job.qanda.askQuestion')}</h4>
                    <Textarea 
                        value={newQuestion}
                        onChange={e => setNewQuestion(e.target.value)}
                        placeholder={t('pages.job.qanda.askPlaceholder')}
                    />
                    <div className="text-right mt-2">
                        <Button onClick={handlePostQuestion} disabled={!newQuestion.trim()}>{t('pages.job.qanda.postQuestion')}</Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QandA;
