import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import Modal from '@/components/ui/Modal';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { generateWidgetPlan, AIWidgetPlan } from '@/services/geminiService';
import AIPrompt from './AIPrompt';
import Button from '@/components/ui/Button';
import { WidgetConfig } from '@/types';
import { ColumnDef } from '@/components/ui/DataTable';

interface WidgetConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    tableId: string;
    widgetToEdit?: WidgetConfig | null;
    preselectedCategoryId?: string;
}

const WidgetConfigModal: React.FC<WidgetConfigModalProps> = ({ isOpen, onClose, tableId, widgetToEdit, preselectedCategoryId }) => {
    const { t } = useTranslation();
    const { leads, invoices, paymentReceipts, expenses, dashboardLayouts } = useAppState();
    const dispatch = useAppDispatch();
    
    const initialAiMessage = widgetToEdit ? t('common.table.dashboard.ai.editInitial') : t('common.table.dashboard.ai.initial');

    const [conversation, setConversation] = useState<{ user: string; ai: string; plan?: AIWidgetPlan }[]>([{ user: '', ai: initialAiMessage }]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentPlan, setCurrentPlan] = useState<AIWidgetPlan | null>(null);

    useEffect(() => {
        if(isOpen) {
            setConversation([{ user: '', ai: widgetToEdit ? t('common.table.dashboard.ai.editInitial') : t('common.table.dashboard.ai.initial') }]);
            setCurrentPlan(null);
            setUserInput('');
        }
    }, [isOpen, widgetToEdit, t]);

    const dashboardLayout = dashboardLayouts[tableId] || [];

    const datasets = useMemo(() => [
        { key: 'leads', columns: [{accessorKey: 'status', header: ()=> 'Status', cell: ()=>null}, {accessorKey: 'category', header: ()=> 'Category', cell: ()=>null}, {accessorKey: 'value', header: ()=>'Value', cell: ()=>null}] },
        { key: 'invoices', columns: [{accessorKey: 'status', header: ()=> 'Status', cell: ()=>null}, {accessorKey: 'amount', header: ()=> 'Amount', cell: ()=>null}, {accessorKey: 'issuedDate', header: ()=>'Date', cell: ()=>null}] },
    ], []);

    const existingCategories = useMemo(() => dashboardLayout.map(c => c.title), [dashboardLayout]);
    
    const handleSubmitPrompt = async () => {
        if (!userInput.trim()) return;

        setIsLoading(true);
        setCurrentPlan(null);
        const userTurn = { user: userInput, ai: '', plan: undefined };
        const history = widgetToEdit ? [...conversation, {user: `(The user wants to edit a widget with this config: ${JSON.stringify(widgetToEdit)})`, ai: 'Understood.'}] : conversation;

        setConversation(prev => [...prev, userTurn]);
        
        try {
            const plan = await generateWidgetPlan(userInput, datasets, existingCategories, history);
            setCurrentPlan(plan);
            setConversation(prev => {
                const newConv = [...prev];
                newConv[newConv.length - 1] = { ...userTurn, ai: plan.explanation, plan: plan };
                return newConv;
            });
        } catch(e) {
             setConversation(prev => {
                const newConv = [...prev];
                newConv[newConv.length - 1] = { ...userTurn, ai: 'Sorry, I had trouble with that request. Please try again.' };
                return newConv;
            });
        } finally {
            setUserInput('');
            setIsLoading(false);
        }
    };
    
    const handleConfirmPlan = () => {
        if (!currentPlan) return;
        
        const finalWidget: WidgetConfig = {
            id: widgetToEdit?.id || `widget-${Date.now()}`,
            type: currentPlan.type,
            title: currentPlan.title,
            dataKey: currentPlan.dataKey as any,
            xAxisColumn: currentPlan.xAxisColumn,
            yAxisColumn: currentPlan.yAxisColumn,
            aggregation: currentPlan.aggregation,
            size: currentPlan.size,
            minSize: currentPlan.minSize,
            maxSize: currentPlan.maxSize,
        };
        
        if (widgetToEdit) {
            dispatch({ type: 'UPDATE_WIDGET', payload: { tableId, widget: finalWidget } });
        } else {
             const targetCategory = dashboardLayout.find(c => c.title.toLowerCase() === currentPlan.category.toLowerCase());
            dispatch({
                type: 'ADD_WIDGET',
                payload: {
                    tableId: tableId,
                    categoryId: preselectedCategoryId || targetCategory?.id,
                    newCategoryTitle: preselectedCategoryId || targetCategory ? undefined : currentPlan.category,
                    widget: finalWidget
                }
            });
        }

        onClose();
    }
    
    const handleClose = () => {
        onClose();
    }

    const PlanDisplay = ({ plan }: { plan: AIWidgetPlan }) => (
        <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-500/30 rounded-lg p-4 my-4 text-sm">
            <h4 className="font-bold text-primary-800 dark:text-primary-200 mb-2">{t('common.table.dashboard.ai.planTitle')}</h4>
            <div className="grid grid-cols-2 gap-2">
                <div><strong>{t('common.table.dashboard.ai.widgetType')}:</strong> {plan.type}</div>
                <div><strong>{t('common.table.dashboard.ai.category')}:</strong> {plan.category}</div>
                <div><strong>{t('common.table.dashboard.ai.size')}:</strong> {t(plan.size > 1 ? 'common.table.dashboard.ai.columns' : 'common.table.dashboard.ai.column', {count: plan.size})}</div>
                <div><strong>Data:</strong> {plan.dataKey}</div>
                {plan.xAxisColumn && <div><strong>X-Axis:</strong> {plan.xAxisColumn}</div>}
                {plan.yAxisColumn && <div><strong>Y-Axis:</strong> {plan.yAxisColumn}</div>}
            </div>
            <p className="mt-3 font-semibold text-primary-700 dark:text-primary-300">{t('common.table.dashboard.ai.askConfirmation')}</p>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={t('common.table.dashboard.panelTitle')}>
            <div className="flex flex-col h-[70vh]">
                <div className="flex-grow overflow-hidden">
                    <AIPrompt
                        conversation={conversation}
                        userInput={userInput}
                        onUserInput={setUserInput}
                        onSubmit={handleSubmitPrompt}
                        isLoading={isLoading}
                    />
                </div>
                {currentPlan && !isLoading && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                        <PlanDisplay plan={currentPlan} />
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setCurrentPlan(null)}>{t('common.table.dashboard.ai.refine')}</Button>
                            <Button onClick={handleConfirmPlan}>{t('common.table.dashboard.ai.create')}</Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default WidgetConfigModal;