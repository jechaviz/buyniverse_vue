
import React from 'react';
import { useAppDispatch } from '@/context/AppStateContext';
import { useTranslation } from '@/hooks/useTranslation';
import DashboardCategory from './DashboardCategory';
import { DashboardCategory as CategoryType, WidgetConfig } from '@/types';

interface DashboardGridProps {
    layout: CategoryType[];
    tableId: string;
    data: any[];
    onEditRequest: (widget: WidgetConfig) => void;
    onAddWidgetRequest: (categoryId: string) => void;
}

const DashboardGrid: React.FC<DashboardGridProps> = ({ layout, tableId, data, onEditRequest, onAddWidgetRequest }) => {
    const dispatch = useAppDispatch();
    
    const handleWidgetDrop = (widgetId: string, sourceCategoryId: string, targetCategoryId: string, targetIndex: number) => {
        if (!widgetId || !sourceCategoryId || !targetCategoryId) return;

        // Clone layout for immutability
        const newLayout = JSON.parse(JSON.stringify(layout));
        
        const sourceCat = newLayout.find((c: CategoryType) => c.id === sourceCategoryId);
        const targetCat = newLayout.find((c: CategoryType) => c.id === targetCategoryId);
        if (!sourceCat || !targetCat) return;

        const widgetIndex = sourceCat.widgets.findIndex((w: WidgetConfig) => w.id === widgetId);
        if (widgetIndex === -1) return;

        // Remove widget from source
        const [widgetToMove] = sourceCat.widgets.splice(widgetIndex, 1);

        // Add widget to target at the specified index
        if(sourceCategoryId === targetCategoryId && widgetIndex < targetIndex) {
            // Adjust index if moving within the same category downwards
            targetCat.widgets.splice(targetIndex - 1, 0, widgetToMove);
        } else {
            targetCat.widgets.splice(targetIndex, 0, widgetToMove);
        }
        
        const finalLayout = newLayout.filter((c: CategoryType) => c.widgets.length > 0);
        
        dispatch({ type: 'SET_DASHBOARD_LAYOUT', payload: { tableId, layout: finalLayout } });
    };
    
    return (
        <div className="space-y-8">
            {layout.map(category => (
                <DashboardCategory 
                    key={category.id} 
                    category={category} 
                    data={data} 
                    onWidgetDrop={handleWidgetDrop} 
                    tableId={tableId}
                    onEditRequest={onEditRequest}
                    onAddWidgetRequest={onAddWidgetRequest}
                    layout={layout}
                />
            ))}
        </div>
    );
};

export default DashboardGrid;
