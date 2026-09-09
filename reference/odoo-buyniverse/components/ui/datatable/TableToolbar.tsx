import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import Input from '../Input';
import Button from '../Button';
import Tooltip from '../Tooltip';
import { TableView } from '@/types';
import ViewsManager from './ViewsManager';
import ButtonGroup from '../ButtonGroup';

interface TableToolbarProps {
  globalFilter: string;
  onGlobalFilterChange: (filter: string) => void;
  onSettingsClick: () => void;
  onImportClick?: () => void;
  onArchiveClick?: () => void;
  selectedRowCount: number;
  tableId?: string;
  views: TableView[];
  activeViewId: string | null;
  onActiveViewChange: (id: string | null) => void;
  onSaveViewClick: () => void;
  isViewDirty: boolean;
  currentViewMode: 'table' | 'cards' | 'kanban' | 'dashboard';
  onViewModeChange: (mode: 'table' | 'cards' | 'kanban' | 'dashboard') => void;
  kanbanEnabled: boolean;
  dashboardEnabled: boolean;
  children?: React.ReactNode;
  disableSettings?: boolean;
}

const TableToolbar: React.FC<TableToolbarProps> = ({
  globalFilter,
  onGlobalFilterChange,
  onSettingsClick,
  onImportClick,
  onArchiveClick,
  selectedRowCount,
  tableId,
  views,
  activeViewId,
  onActiveViewChange,
  onSaveViewClick,
  isViewDirty,
  currentViewMode,
  onViewModeChange,
  kanbanEnabled,
  dashboardEnabled,
  children,
  disableSettings
}) => {
    const { t } = useTranslation();
    const [localFilter, setLocalFilter] = useState(globalFilter);

    useEffect(() => {
        setLocalFilter(globalFilter);
    }, [globalFilter]);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (localFilter !== globalFilter) {
                onGlobalFilterChange(localFilter);
            }
        }, 300);

        return () => {
            clearTimeout(handler);
        };
    }, [localFilter, globalFilter, onGlobalFilterChange]);
    
    const viewOptions = [
        { label: <Tooltip content={t('common.table.table')}><i className="fa-solid fa-table"></i></Tooltip>, value: 'table' },
        { label: <Tooltip content={t('common.table.cards')}><i className="fa-solid fa-grip"></i></Tooltip>, value: 'cards' },
    ];
    if (kanbanEnabled) viewOptions.push({ label: <Tooltip content={t('common.table.kanban')}><i className="fa-solid fa-table-columns"></i></Tooltip>, value: 'kanban' });
    if (dashboardEnabled) viewOptions.push({ label: <Tooltip content={t('common.table.dashboard.title')}><i className="fa-solid fa-chart-pie"></i></Tooltip>, value: 'dashboard' });


  return (
    <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                {tableId && views.length > 0 && (
                     <ViewsManager 
                        views={views}
                        activeViewId={activeViewId}
                        onSelectView={onActiveViewChange}
                        onSave={onSaveViewClick}
                        isDirty={isViewDirty}
                     />
                )}
                 <div className="relative w-full sm:max-w-xs flex-grow sm:flex-grow-0">
                    <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <Input
                        placeholder={t('common.table.searchPlaceholder')}
                        value={localFilter}
                        onChange={e => setLocalFilter(e.target.value)}
                        className="pl-9 !py-2"
                    />
                </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end w-full sm:w-auto">
                <ButtonGroup 
                    options={viewOptions}
                    selectedValue={currentViewMode}
                    onSelectionChange={(v) => onViewModeChange(v as any)}
                />
                {!disableSettings && (
                    <Tooltip content={t('common.table.settings')}>
                        <Button variant="secondary" onClick={onSettingsClick}><i className="fa-solid fa-sliders"></i></Button>
                    </Tooltip>
                )}
                {children}
            </div>
        </div>
    </div>
  );
};

export default React.memo(TableToolbar);
