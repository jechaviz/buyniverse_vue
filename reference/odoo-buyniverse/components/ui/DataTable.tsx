import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { FilterGroup, TableView } from '@/types';
import { KanbanView } from './KanbanView';
import { DashboardView } from '@/features/dashboard';
import Card from './Card';
import DataForm from '@/features/common/forms/DataForm';
import Button from './Button';
import { generateCardLayoutConfig, AICardLayoutConfig } from '@/services/geminiService';
import TableHeader from './datatable/TableHeader';
import TableBody from './datatable/TableBody';
import TableToolbar from './datatable/TableToolbar';
import TablePagination from './datatable/TablePagination';
import SettingsModal from './datatable/SettingsModal';
import SaveViewModal from './datatable/SaveViewModal';
import Tooltip from './Tooltip';
import GroupByTabs from '@/features/common/components/GroupByTabs';
import { ColumnDef, ExpandableRelation, KanbanConfig, UIConfig, PRESETS, DataTableProps } from './datatable/types';

export * from './datatable/types';

export function DataTable<TData extends { [key: string]: any }>({
    columns,
    data,
    idKey,
    tableId,
    pageTitle = 'Items',
    dataKey,
    globalFilter: externalGlobalFilter,
    onGlobalFilterChange: onExternalGlobalFilterChange,
    rowSelection = {},
    onRowSelectionChange = () => {},
    kanbanConfig,
    onImport,
    onArchive,
    enableRowDnd = false,
    onRowOrderChange,
    onSaveRecord,
    onDeleteRecord,
    onUpdateCell,
    enableCrud = false,
    createMode = 'page',
    renderFormView,
    children,
    expandableRelations,
    preset = 'default',
    uiConfig: uiConfigOverrides,
    initialGroupByColumns = [],
    initialView = 'table',
    renderCard,
}: DataTableProps<TData>) {
    const { t } = useTranslation();
    const appState = useAppState();
    const { users, tableAdminConfig } = appState;
    const dispatch = useAppDispatch();
    const tableViews = useMemo(() => (tableId ? appState.tableViews[tableId] || [] : []), [appState.tableViews, tableId]);
    const adminConfig = tableId ? tableAdminConfig[tableId] : undefined;

    const defaultView = useMemo(() => tableViews.find(v => v.isDefault) || tableViews[0], [tableViews]);

    const [internalGlobalFilter, setInternalGlobalFilter] = useState('');
    const globalFilter = externalGlobalFilter ?? internalGlobalFilter;
    const onGlobalFilterChange = onExternalGlobalFilterChange ?? setInternalGlobalFilter;

    const [activeViewId, setActiveViewId] = useState<string | null>(defaultView?.id || null);
    const [isViewDirty, setIsViewDirty] = useState(false);
    
    const [sorting, setSorting] = useState<{ id: string, desc: boolean }[]>(defaultView?.config.sorting || []);
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(defaultView?.config.columnVisibility || adminConfig?.defaultColumnVisibility || {});
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [filterGroup, setFilterGroup] = useState<FilterGroup>(defaultView?.config.filters || { id: 'root', logic: 'AND', filters: [] });
    const [columnOrder, setColumnOrder] = useState<string[]>(defaultView?.config.columnOrder || columns.map(c => String(c.accessorKey)));
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>(defaultView?.config.columnWidths || {});
    const [groupByColumns, setGroupByColumns] = useState<string[]>(defaultView?.config.groupByColumns || initialGroupByColumns);
    const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
    const [activeFilterPopover, setActiveFilterPopover] = useState<string | null>(null);
    const [activeGroupFilters, setActiveGroupFilters] = useState<Record<string, string>>({});


    const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
    const [isSaveViewModalOpen, setSaveViewModalOpen] = useState(false);
    const [activeView, setActiveView] = useState<'table' | 'cards' | 'kanban' | 'dashboard'>(initialView);
    const [focusedRecord, setFocusedRecord] = useState<{ id: string; mode: 'create' | 'edit' } | null>(null);
    const [draftData, setDraftData] = useState<Partial<TData>>({});

    const uiConfig = { ...PRESETS[preset], ...uiConfigOverrides };

    const markViewDirty = () => setIsViewDirty(true);

    const handleSortChange = (newSorting: { id: string, desc: boolean }[]) => { setSorting(newSorting); markViewDirty(); };
    const handleFilterChange = (newFilterGroup: FilterGroup) => { setFilterGroup(newFilterGroup); markViewDirty(); };
    const handleColumnVisibilityChange = (newVisibility: Record<string, boolean>) => { setColumnVisibility(newVisibility); markViewDirty(); };
    const handleColumnOrderChange = (newOrder: string[]) => { setColumnOrder(newOrder); markViewDirty(); };
    const handleGroupByChange = (newGroupBy: string[]) => { setGroupByColumns(newGroupBy); setActiveGroupFilters({}); markViewDirty(); };
    const handleColumnResize = (newWidths: Record<string, number>) => { setColumnWidths(newWidths); markViewDirty(); };
    const handleColumnFilterChange = (columnId: string, value: string) => {
        setColumnFilters(prev => ({ ...prev, [columnId]: value }));
    };

    useEffect(() => {
        const view = tableViews.find(v => v.id === activeViewId);
        if (view) {
            setSorting(view.config.sorting || []);
            setFilterGroup(view.config.filters || { id: 'root', logic: 'AND', filters: [] });
            setColumnVisibility(view.config.columnVisibility || adminConfig?.defaultColumnVisibility || {});
            setColumnOrder(view.config.columnOrder || columns.map(c => String(c.accessorKey)));
            setGroupByColumns(view.config.groupByColumns || []);
            setColumnWidths(view.config.columnWidths || {});
            setActiveGroupFilters({});
            setIsViewDirty(false);
        }
    }, [activeViewId, tableViews, adminConfig]);

    const { paginatedData, pageCount, sortedData } = useMemo(() => {
        let filtered = data.filter(row => {
            if (!globalFilter && Object.values(columnFilters).every(v => !v)) return true;
            
            const matchesGlobal = !globalFilter || columns.some(col => 
                String(row[col.accessorKey as keyof TData] ?? '').toLowerCase().includes(String(globalFilter ?? '').toLowerCase())
            );

            const matchesColumn = Object.entries(columnFilters).every(([colId, filterValue]) => {
                if (!filterValue) return true;
                return String(row[colId] ?? '').toLowerCase().includes(String(filterValue).toLowerCase());
            });

            return matchesGlobal && matchesColumn;
        });

        const applyFilters = (data: TData[], fg: FilterGroup): TData[] => data.filter(row => {
            const checkRule = (rule: any) => String(row[rule.columnId] ?? '').toLowerCase().includes(String(rule.value).toLowerCase());
            const checkGroup = (filterGroup: FilterGroup): boolean => {
                const results = filterGroup.filters.map(f => 'logic' in f ? checkGroup(f) : checkRule(f));
                return filterGroup.logic === 'AND' ? results.every(Boolean) : results.some(Boolean);
            };
            return checkGroup(fg);
        });
        filtered = applyFilters(filtered, filterGroup);

        const sorted = [...filtered].sort((a, b) => {
            for (const s of sorting) {
                const aVal = a[s.id];
                const bVal = b[s.id];
                if (aVal < bVal) return s.desc ? 1 : -1;
                if (aVal > bVal) return s.desc ? -1 : 1;
            }
            return 0;
        });
        
        let grouped = sorted;
        if (Object.keys(activeGroupFilters).length > 0) {
            grouped = sorted.filter(row => {
                return Object.entries(activeGroupFilters).every(([col, val]) => {
                    return String(row[col]) === val;
                });
            });
        }
        
        const start = pagination.pageIndex * pagination.pageSize;
        const paginated = grouped.slice(start, start + pagination.pageSize);

        return { paginatedData: paginated, pageCount: Math.ceil(grouped.length / pagination.pageSize), sortedData: sorted };
    }, [data, globalFilter, columnFilters, filterGroup, sorting, pagination, columns, activeGroupFilters]);

    const handleCreateClick = () => {
        if (!enableCrud) return;
        setDraftData({});
        setFocusedRecord({ id: 'new', mode: 'create' });
    };

    const handleEditClick = (row: TData) => {
        setDraftData(row);
        setFocusedRecord({ id: row[idKey], mode: 'edit' });
    };

    const handleDeleteClick = (id: string) => {
        if (onDeleteRecord && window.confirm('Are you sure you want to delete this record?')) {
            onDeleteRecord(id);
        }
    };
    
    const finalColumns = useMemo(() => {
        if (!enableCrud) return columns;
        return [
            ...columns,
            {
                accessorKey: 'action',
                header: () => t('common.table.actions'),
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        <Tooltip content={t('common.edit')}>
                            <button onClick={() => handleEditClick(row)} className="h-8 w-8 rounded-lg flex items-center justify-center hover:text-sky-500"><i className="fa-solid fa-pencil"></i></button>
                        </Tooltip>
                        <Tooltip content={t('common.delete')}>
                            <button onClick={() => handleDeleteClick(row[idKey])} className="h-8 w-8 rounded-lg flex items-center justify-center hover:text-red-500"><i className="fa-solid fa-trash-can"></i></button>
                        </Tooltip>
                    </div>
                )
            }
        ];
    }, [columns, enableCrud, t, idKey]);


    const handleCancelForm = () => {
        setFocusedRecord(null);
        setDraftData({});
    };

    const handleSaveForm = () => {
        if (onSaveRecord) onSaveRecord(draftData as TData);
        handleCancelForm();
    };
    
    if (focusedRecord && createMode === 'page') {
        if (renderFormView) {
            return renderFormView({
                initialData: draftData,
                onSave: handleSaveForm as (data: TData) => void,
                onCancel: handleCancelForm,
                mode: focusedRecord.mode,
            });
        }
        return (
             <DataForm
                title={focusedRecord.mode === 'create' ? `Create New ${pageTitle.slice(0, -1)}` : `Edit ${pageTitle.slice(0, -1)}`}
                columns={columns}
                draftData={draftData}
                onUpdate={(key, value) => setDraftData(prev => ({...prev, [key]: value}))}
                onSave={handleSaveForm}
                onCancel={handleCancelForm}
                users={users}
            />
        );
    }

    return (
        <div className="bg-transparent">
            {groupByColumns.length > 0 && activeView === 'table' && (
                <GroupByTabs
                    data={sortedData}
                    groupByColumns={groupByColumns}
                    columns={columns}
                    activeFilters={activeGroupFilters}
                    onFilterChange={setActiveGroupFilters}
                />
            )}
            <Card className={uiConfig.cardShell ? "overflow-hidden" : ""}>
                {uiConfig.toolbar && (
                    <TableToolbar
                        globalFilter={globalFilter}
                        onGlobalFilterChange={onGlobalFilterChange}
                        onSettingsClick={() => setSettingsModalOpen(true)}
                        onImportClick={onImport ? () => {} : undefined}
                        onArchiveClick={onArchive}
                        selectedRowCount={Object.keys(rowSelection).length}
                        tableId={tableId}
                        views={tableViews}
                        activeViewId={activeViewId}
                        onActiveViewChange={setActiveViewId}
                        onSaveViewClick={() => setSaveViewModalOpen(true)}
                        isViewDirty={isViewDirty}
                        currentViewMode={activeView}
                        onViewModeChange={setActiveView}
                        kanbanEnabled={!!kanbanConfig}
                        dashboardEnabled={!!tableId && !!dataKey}
                        disableSettings={adminConfig?.disableSettings}
                    >
                        {children}
                        {enableCrud && (
                            <Tooltip content={`Add New ${pageTitle.slice(0, -1)}`}>
                                <button onClick={handleCreateClick} className="ml-2 w-10 h-10 rounded-full bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center shadow-md transition-transform transform hover:scale-110">
                                    <i className="fa-solid fa-plus text-lg"></i>
                                </button>
                            </Tooltip>
                        )}
                    </TableToolbar>
                )}

                {activeView === 'table' && (
                     <div className="overflow-x-auto">
                        <table className="w-full" style={{ tableLayout: 'fixed' }}>
                            {uiConfig.header && (
                                <TableHeader
                                    columns={finalColumns}
                                    columnOrder={columnOrder}
                                    onColumnOrderChange={handleColumnOrderChange}
                                    columnVisibility={columnVisibility}
                                    sorting={sorting}
                                    onSortingChange={handleSortChange}
                                    onRowSelectionChange={onRowSelectionChange}
                                    data={data}
                                    rowSelection={rowSelection}
                                    idKey={idKey}
                                    columnWidths={columnWidths}
                                    onColumnResize={handleColumnResize}
                                    activeFilterPopover={activeFilterPopover}
                                    onActiveFilterPopoverChange={setActiveFilterPopover}
                                    columnFilters={columnFilters}
                                    onColumnFilterChange={handleColumnFilterChange}
                                />
                            )}
                            <TableBody
                                columns={finalColumns}
                                data={paginatedData}
                                idKey={idKey}
                                columnOrder={columnOrder}
                                columnVisibility={columnVisibility}
                                rowSelection={rowSelection}
                                onRowSelectionChange={onRowSelectionChange}
                                onUpdateCell={onUpdateCell}
                                adminConfig={adminConfig}
                            />
                        </table>
                    </div>
                )}

                {activeView === 'kanban' && kanbanConfig && <KanbanView data={sortedData} kanbanConfig={kanbanConfig} idKey={idKey} />}
                {activeView === 'dashboard' && tableId && dataKey && <DashboardView tableId={tableId} data={data} />}

                {uiConfig.pagination && <TablePagination pagination={pagination} onPaginationChange={setPagination} pageCount={pageCount} rowSelection={rowSelection} totalRows={data.length} />}
            </Card>

            <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setSettingsModalOpen(false)} columns={columns} columnVisibility={columnVisibility} onColumnVisibilityChange={handleColumnVisibilityChange} filterGroup={filterGroup} onFilterGroupChange={handleFilterChange} sorting={sorting} onSortingChange={handleSortChange} groupByColumns={groupByColumns} onGroupByColumnsChange={handleGroupByChange} />
            
            {tableId && (
                <SaveViewModal 
                    isOpen={isSaveViewModalOpen}
                    onClose={() => setSaveViewModalOpen(false)}
                    tableId={tableId}
                    currentView={tableViews.find(v => v.id === activeViewId)}
                    onSave={(view) => {
                        const action = tableViews.some(v => v.id === view.id) ? 'UPDATE_TABLE_VIEW' : 'SAVE_TABLE_VIEW';
                        dispatch({ type: action, payload: { tableId, view } });
                        setActiveViewId(view.id);
                        setIsViewDirty(false);
                    }}
                    onDelete={(viewId) => {
                        dispatch({ type: 'DELETE_TABLE_VIEW', payload: { tableId, viewId } });
                        setActiveViewId(defaultView?.id || null);
                    }}
                    getCurrentConfig={() => ({
                        filters: filterGroup,
                        sorting,
                        columnVisibility,
                        columnOrder,
                        groupByColumns,
                        columnWidths,
                    })}
                />
            )}
        </div>
    );
}

export default DataTable;