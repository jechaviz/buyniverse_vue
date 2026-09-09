import React, { useRef, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { AIWidgetPlan } from '@/services/geminiService';

interface AIPromptProps {
    conversation: { user: string; ai: string, plan?: AIWidgetPlan }[];
    userInput: string;
    onUserInput: (input: string) => void;
    onSubmit: () => void;
    isLoading: boolean;
}

const AIPrompt: React.FC<AIPromptProps> = ({ conversation, userInput, onUserInput, onSubmit, isLoading }) => {
    const { t } = useTranslation();
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [conversation]);

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50">
            <div ref={scrollRef} className="flex-grow p-4 space-y-4 overflow-y-auto">
                {conversation.map((turn, index) => (
                    <div key={index} className="space-y-2">
                        {turn.user && (
                            <div className="flex justify-end">
                                <div className="bg-primary-600 text-white rounded-lg rounded-br-none p-3 max-w-sm text-sm">
                                    {turn.user}
                                </div>
                            </div>
                        )}
                        {turn.ai && (
                             <div className="flex justify-start">
                                <div className="bg-white dark:bg-slate-700 rounded-lg rounded-bl-none p-3 max-w-sm text-sm shadow-sm border dark:border-slate-600">
                                    {turn.ai}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && (
                     <div className="flex justify-start">
                        <div className="bg-white dark:bg-slate-700 rounded-lg rounded-bl-none p-3 max-w-sm text-sm shadow-sm border dark:border-slate-600 flex items-center gap-2">
                           <Spinner size="sm" color="border-primary-500"/>
                           <span>{t('common.table.dashboard.ai.thinking')}</span>
                        </div>
                    </div>
                )}
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="flex gap-2">
                    <Input
                        wrapperClassName="flex-grow"
                        placeholder={t('common.table.dashboard.ai.placeholder')}
                        value={userInput}
                        onChange={(e) => onUserInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !isLoading && onSubmit()}
                        disabled={isLoading}
                    />
                    <Button onClick={onSubmit} disabled={isLoading || !userInput}>
                        <i className="fa-solid fa-paper-plane"></i>
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AIPrompt;