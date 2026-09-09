
import React, { useState } from 'react';
import { useAppState } from '@/context/AppStateContext';
import { useTranslation } from '@/hooks/useTranslation';
import DashboardGrid from './DashboardGrid';
import Button from '@/components/ui/Button';
import WidgetConfigModal from './WidgetConfigModal';
import { WidgetConfig } from '@/types';

interface DashboardViewProps {
    tableId: string;
    data: any[];
}

const DashboardView: React.FC<DashboardViewProps> = ({ tableId, data }) => {
    const { t } = useTranslation();
    const { dashboardLayouts } = useAppState();
    const layout = dashboardLayouts[tableId] || [];
    const [isConfigModalOpen, setConfigModalOpen] = useState(false);
    const [widgetToEdit, setWidgetToEdit] = useState<WidgetConfig | null>(null);
    const [preselectedCategoryId, setPreselectedCategoryId] = useState<string | undefined>(undefined);

    const handleEditRequest = (widget: WidgetConfig) => {
        setWidgetToEdit(widget);
        setConfigModalOpen(true);
    };
    
    const handleAddRequest = (categoryId?: string) => {
        setWidgetToEdit(null);
        setPreselectedCategoryId(categoryId);
        setConfigModalOpen(true);
    };

    const handleCloseModal = () => {
        setConfigModalOpen(false);
        setWidgetToEdit(null);
        setPreselectedCategoryId(undefined);
    };
    
    return (
        <div className="p-4">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{t('common.table.dashboard.title')}</h2>
                <Button onClick={() => handleAddRequest()}>
                    <i className="fa-solid fa-wand-magic-sparkles mr-2"></i>
                    {t('common.table.dashboard.configure')}
                </Button>
             </div>
             {layout.length === 0 ? (
                <div className="text-center py-20 px-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl m-4">
                    <i className="fa-solid fa-chart-pie text-6xl text-slate-300 dark:text-slate-600"></i>
                    <h3 className="mt-4 text-xl font-semibold">{t('common.table.dashboard.empty')}</h3>
                    <p className="mt-1 text-slate-500">{t('common.table.dashboard.prompt')}</p>
                </div>
            ) : (
                <DashboardGrid 
                    layout={layout} 
                    data={data} 
                    tableId={tableId} 
                    onEditRequest={handleEditRequest}
                    onAddWidgetRequest={handleAddRequest}
                />
            )}
             <WidgetConfigModal 
                isOpen={isConfigModalOpen} 
                onClose={handleCloseModal} 
                tableId={tableId} 
                widgetToEdit={widgetToEdit}
                preselectedCategoryId={preselectedCategoryId}
             />
        </div>
    );
};

export default DashboardView;
