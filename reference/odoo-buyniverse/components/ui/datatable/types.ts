import React from 'react';
import { FilterGroup, TableView } from '@/types';

export interface ColumnDef<TData> {
    accessorKey: keyof TData | 'action' | string;
    header: () => React.ReactNode;
    cell: (props: { row: TData }) => React.ReactNode;
    enableSorting?: boolean;
    enableFiltering?: boolean;
    editConfig?: EditConfig;
}

export type EditConfig = 
  | { type: 'text' }
  | { type: 'number' }
  | { type: 'select', options: { value: string, label: string }[] }
  | { type: 'slider' }
  | { type: 'user' }
  | { type: 'tags' }
  | { type: 'rating' }
  | { type: 'multi-user' }
  | { type: 'date' }
  | { type: 'email' };

export interface KanbanConfig<TData> {
    enabled: boolean;
    groupBy: keyof TData;
    columns: string[];
    renderCard: (item: TData) => React.ReactNode;
    onCardMove: (cardId: string, newColumnId: string) => void;
}

export interface UIConfig {
    toolbar?: boolean;
    header?: boolean;
    pagination?: boolean;
    cardShell?: boolean; // wrap cards in a Card component
}

export const PRESETS: { [key: string]: UIConfig } = {
    default: { toolbar: true, header: true, pagination: true, cardShell: true },
    minimal: { toolbar: false, header: true, pagination: false, cardShell: true },
    subTable: { toolbar: false, header: true, pagination: true, cardShell: false },
};

export interface ExpandableRelation<TData> {
    label: string;
    hasDataChecker: (row: TData) => boolean;
    getNestedTableProps: (row: TData) => Omit<DataTableProps<any>, 'expandableRelations' | 'onSaveRecord' | 'onDeleteRecord' | 'enableCrud'>;
}

export interface DataTableProps<TData> {
    columns: ColumnDef<TData>[];
    data: TData[];
    idKey: keyof TData;
    tableId?: string; // For saving views and dashboard configs
    pageTitle?: string;
    dataKey?: 'leads' | 'invoices' | 'payments' | 'expenses' | 'suppliers';
    globalFilter?: string;
    onGlobalFilterChange?: (filter: string) => void;
    rowSelection?: Record<string, boolean>;
    onRowSelectionChange?: (updater: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
    kanbanConfig?: KanbanConfig<TData>;
    onImport?: (data: Omit<TData, 'id'>[]) => void;
    onArchive?: () => void;
    enableRowDnd?: boolean;
    onRowOrderChange?: (reorderedData: TData[]) => void;
    onSaveRecord?: (record: TData) => void;
    onDeleteRecord?: (recordId: string) => void;
    onUpdateCell?: (rowId: string, columnId: string, value: any) => void;
    enableCrud?: boolean;
    createMode?: 'modal' | 'page' | 'inline';
    renderFormView?: React.FC<{
        initialData: Partial<TData>;
        onSave: (data: TData) => void;
        onCancel: () => void;
        mode: 'create' | 'edit';
    }>;
    children?: React.ReactNode; // For custom toolbar actions
    expandableRelations?: ExpandableRelation<TData>[];
    preset?: keyof typeof PRESETS;
    uiConfig?: Partial<UIConfig>;
    initialGroupByColumns?: string[];
    initialView?: 'table' | 'cards' | 'kanban' | 'dashboard';
    renderCard?: (row: TData) => React.ReactNode;
}
