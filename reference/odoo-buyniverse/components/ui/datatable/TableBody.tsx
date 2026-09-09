import React, { useState } from 'react';
import { ColumnDef, ExpandableRelation } from './types';
import { InlineEditor } from '../inline-editors';
import { useAppContextMenu } from '@/context/AppContextMenuContext';
import { TableAdminConfig } from '@/types';

interface TableBodyProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  idKey: keyof TData;
  columnOrder: string[];
  columnVisibility: Record<string, boolean>;
  rowSelection: Record<string, boolean>;
  onRowSelectionChange: (updater: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  onUpdateCell?: (rowId: string, columnId: string, value: any) => void;
  expandableRelations?: ExpandableRelation<TData>[];
  adminConfig?: TableAdminConfig[string];
}

const TableBody = <TData extends { [key: string]: any }>({
  columns,
  data,
  idKey,
  columnOrder,
  columnVisibility,
  rowSelection,
  onRowSelectionChange,
  onUpdateCell,
  expandableRelations,
  adminConfig,
}: TableBodyProps<TData>) => {
    const { showMenu } = useAppContextMenu();
    const [editingCell, setEditingCell] = useState<{ rowId: string, columnId: string } | null>(null);

    const orderedColumns = React.useMemo(() => {
        return columnOrder.map(key => columns.find(c => String(c.accessorKey) === key)).filter(Boolean) as ColumnDef<TData>[];
    }, [columnOrder, columns]);

    const handleContextMenu = (e: React.MouseEvent, row: TData, columnId?: string) => {
        showMenu(e, {
            type: columnId ? 'cell' : 'row',
            data: { ...row, columnId },
            onConfigureCardLayout: () => console.log('Configure Card Layout'),
        });
    };
    
    const handleCellClick = (rowId: string, columnId: string, editConfig?: any) => {
        const canEdit = adminConfig?.columnPermissions?.[columnId] !== 'read';
        if (editConfig && onUpdateCell && canEdit) {
            setEditingCell({ rowId, columnId });
        }
    };
    
    const handleSaveEdit = (value: any) => {
        if (editingCell && onUpdateCell) {
            onUpdateCell(editingCell.rowId, editingCell.columnId, value);
        }
        setEditingCell(null);
    };

  return (
    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
      {data.map(row => (
        <tr
          key={row[idKey]}
          className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${rowSelection[row[idKey]] ? 'bg-primary-50 dark:bg-primary-900/30' : ''}`}
          onContextMenu={(e) => handleContextMenu(e, row)}
        >
          {orderedColumns.map(column => {
            if (columnVisibility[String(column.accessorKey)] === false) return null;
            const columnId = String(column.accessorKey);
            const isEditing = editingCell?.rowId === row[idKey] && editingCell?.columnId === columnId;
            
            return (
              <td 
                key={columnId} 
                className="p-3 text-sm text-slate-700 dark:text-slate-300"
                onContextMenu={(e) => handleContextMenu(e, row, columnId)}
                onDoubleClick={() => handleCellClick(row[idKey], columnId, column.editConfig)}
              >
                {isEditing && column.editConfig ? (
                    <InlineEditor
                        value={row[column.accessorKey as keyof TData]}
                        onSave={handleSaveEdit}
                        onCancel={() => setEditingCell(null)}
                        editConfig={column.editConfig}
                    />
                ) : (
                    column.cell({ row })
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </tbody>
  );
};

export default TableBody;