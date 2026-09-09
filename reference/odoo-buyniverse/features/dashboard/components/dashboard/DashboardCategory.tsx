
import React, { useState } from 'react';
import { DashboardCategory as CategoryType, WidgetConfig } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppDispatch } from '@/context/AppStateContext';
import DashboardWidget from './DashboardWidget';
import Dropdown from '@/components/ui/Dropdown';

interface DashboardCategoryProps {
  category: CategoryType;
  onWidgetDrop: (widgetId: string, sourceCategoryId: string, targetCategoryId: string, targetIndex: number) => void;
  tableId: string;
  data: any[];
  onEditRequest: (widget: WidgetConfig) => void;
  onAddWidgetRequest: (categoryId: string) => void;
  layout: CategoryType[];
}

const DashboardCategory: React.FC<DashboardCategoryProps> = ({ category, onWidgetDrop, tableId, data, onEditRequest, onAddWidgetRequest, layout }) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [title, setTitle] = useState(category.title);
    const [isDragOver, setIsDragOver] = useState(false);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
    };

    const handleTitleBlur = () => {
        setIsEditingTitle(false);
        if(title.trim() && title !== category.title) {
            dispatch({ type: 'UPDATE_CATEGORY_TITLE', payload: { tableId, categoryId: category.id, title: title.trim() } });
        } else {
            setTitle(category.title);
        }
    };
    
    const handleDeleteCategory = () => {
        if(window.confirm(t('common.table.dashboard.confirmDeleteCategory'))) {
            // This needs a new action type to delete a category and its widgets
            console.log("Deleting category", category.id);
        }
    }

    return (
        <div 
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
                const widgetId = e.dataTransfer.getData("widgetId");
                const sourceCategoryId = e.dataTransfer.getData("sourceCategoryId");
                // Drop at the end of the list if not over a specific widget
                onWidgetDrop(widgetId, sourceCategoryId, category.id, category.widgets.length);
                setIsDragOver(false);
            }}
            className={`p-4 rounded-lg transition-colors duration-300 ${isDragOver ? 'bg-primary-100/50 dark:bg-primary-900/50' : ''}`}
        >
            <div className="flex justify-between items-center mb-4">
                {isEditingTitle ? (
                    <input 
                        type="text"
                        value={title}
                        onChange={handleTitleChange}
                        onBlur={handleTitleBlur}
                        onKeyDown={e => e.key === 'Enter' && handleTitleBlur()}
                        className="text-xl font-bold bg-transparent border-b-2 border-primary-500 focus:outline-none"
                        autoFocus
                    />
                ) : (
                    <h2 className="text-xl font-bold cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                        {category.title}
                    </h2>
                )}
                <Dropdown
                    align="right"
                    trigger={<button className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><i className="fa-solid fa-ellipsis-h"></i></button>}
                >
                    <div className="py-1">
                        <button onClick={() => onAddWidgetRequest(category.id)} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">{t('common.table.dashboard.addWidget')}</button>
                        <button onClick={() => setIsEditingTitle(true)} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">{t('common.table.dashboard.editCategory')}</button>
                        <button onClick={handleDeleteCategory} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">{t('common.table.dashboard.deleteCategory')}</button>
                    </div>
                </Dropdown>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {category.widgets.map((widget, index) => (
                    <DashboardWidget 
                        key={widget.id} 
                        widget={widget} 
                        data={data} 
                        tableId={tableId} 
                        categoryId={category.id}
                        onEditRequest={onEditRequest}
                        onDrop={(widgetId, sourceCatId) => onWidgetDrop(widgetId, sourceCatId, category.id, index)}
                        layout={layout}
                    />
                ))}
            </div>
        </div>
    );
};

export default DashboardCategory;
