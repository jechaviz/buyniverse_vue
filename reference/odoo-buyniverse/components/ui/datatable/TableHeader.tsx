import React, { useState, useRef, useMemo } from 'react';
import { ColumnDef } from './types';
import { useAppContextMenu } from '@/context/AppContextMenuContext';
import { ColumnFilterPopover } from './ColumnFilterPopover';

interface TableHeaderProps<TData> {
  columns: ColumnDef<TData>[];
  columnOrder: string[];
  onColumnOrderChange: (newOrder: string[]) => void;
  columnVisibility: Record<string, boolean>;
  sorting: { id: string, desc: boolean }[];
  onSortingChange: (sorting: { id: string, desc: boolean }[]) => void;
  onRowSelectionChange: (updater: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  data: TData[];
  rowSelection: Record<string, boolean>;
  idKey: keyof TData;
  columnWidths: Record<string, number>;
  onColumnResize: (newWidths: Record<string, number>) => void;
  activeFilterPopover: string | null;
  onActiveFilterPopoverChange: (columnId: string | null) => void;
  columnFilters: Record<string, string>;
  onColumnFilterChange: (columnId: string, value: string) => void;
}

const TableHeader = <TData extends { [key: string]: any }>({
  columns,
  columnOrder,
  onColumnOrderChange,
  columnVisibility,
  sorting,
  onSortingChange,
  onRowSelectionChange,
  data,
  rowSelection,
  idKey,
  columnWidths,
  onColumnResize,
  activeFilterPopover,
  onActiveFilterPopoverChange,
  columnFilters,
  onColumnFilterChange,
}: TableHeaderProps<TData>) => {
    const { showMenu } = useAppContextMenu();
    const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
    const resizingColumnRef = useRef<string | null>(null);
    const startXRef = useRef(0);
    const startWidthRef = useRef(0);
    const headerRef = useRef<HTMLTableCellElement>(null);

    const orderedColumns = useMemo(() => {
        return columnOrder.map(key => columns.find(c => String(c.accessorKey) === key)).filter(Boolean) as ColumnDef<TData>[];
    }, [columnOrder, columns]);

    const handleSort = (columnId: string) => {
        const existingSort = sorting.find(s => s.id === columnId);
        if (existingSort) {
            if (existingSort.desc) {
                onSortingChange(sorting.filter(s => s.id !== columnId));
            } else {
                onSortingChange(sorting.map(s => s.id === columnId ? { ...s, desc: true } : s));
            }
        } else {
            onSortingChange([...sorting, { id: columnId, desc: false }]);
        }
    };
    
    // Drag and Drop for column reordering
    const handleDragStart = (e: React.DragEvent, key: string) => {
        setDraggedColumn(key);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => e.preventDefault();
    
    const handleDrop = (e: React.DragEvent, targetKey: string) => {
        if (!draggedColumn) return;
        const newOrder = [...columnOrder];
        const draggedIndex = newOrder.indexOf(draggedColumn);
        const targetIndex = newOrder.indexOf(targetKey);
        
        const [removed] = newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, removed);
        
        onColumnOrderChange(newOrder);
        setDraggedColumn(null);
    };

    // Column resizing
    const onMouseDown = (e: React.MouseEvent<HTMLDivElement>, columnId: string) => {
        resizingColumnRef.current = columnId;
        startXRef.current = e.clientX;
        const th = (e.target as HTMLElement).closest('th');
        startWidthRef.current = th?.offsetWidth || 0;
        document.body.style.cursor = 'col-resize';
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e: MouseEvent) => {
        if (!resizingColumnRef.current) return;
        const diffX = e.clientX - startXRef.current;
        const newWidth = Math.max(startWidthRef.current + diffX, 50); // Minimum width 50px
        onColumnResize({ ...columnWidths, [resizingColumnRef.current]: newWidth });
    };

    const onMouseUp = () => {
        resizingColumnRef.current = null;
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
    };
    
  return (
    <thead className="bg-slate-50 dark:bg-slate-700/50">
      <tr>
        {orderedColumns.map(column => {
          if (columnVisibility[String(column.accessorKey)] === false) return null;

          const isSorted = sorting.find(s => s.id === column.accessorKey);
          const columnId = String(column.accessorKey);
          const isFiltered = columnFilters[columnId];
          
          return (
            <th
              key={columnId}
              ref={headerRef}
              scope="col"
              className="group p-3 text-left text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider relative select-none"
              style={{ width: columnWidths[columnId] ? `${columnWidths[columnId]}px` : undefined }}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, columnId)}
            >
              <div className="flex items-center justify-between">
                <div 
                    className={`flex items-center gap-2 ${column.enableSorting ? 'cursor-pointer' : ''}`}
                    onClick={() => column.enableSorting && handleSort(columnId)}
                >
                    <span 
                        className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
                        draggable
                        onDragStart={(e) => handleDragStart(e, columnId)}
                    >
                        <i className="fa-solid fa-grip-vertical text-slate-400"></i>
                    </span>
                    <span>{column.header()}</span>
                </div>
                <div className="flex items-center gap-1">
                    {column.enableSorting && (
                        <span className="w-4 text-center">
                            {isSorted && <i className={`fa-solid ${isSorted.desc ? 'fa-sort-down' : 'fa-sort-up'}`}></i>}
                            {!isSorted && <i className="fa-solid fa-sort text-slate-300 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-300"></i>}
                        </span>
                    )}
                    {column.enableFiltering && (
                        <div className="relative">
                            <button onClick={(e) => { e.stopPropagation(); onActiveFilterPopoverChange(columnId === activeFilterPopover ? null : columnId); }} className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${isFiltered || activeFilterPopover === columnId ? 'bg-primary-100 dark:bg-primary-500/20 text-primary-600' : 'text-slate-300 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-300'}`}>
                                <i className="fa-solid fa-filter text-xs"></i>
                            </button>
                            {activeFilterPopover === columnId && (
                                <ColumnFilterPopover 
                                    columnId={columnId}
                                    value={columnFilters[columnId] || ''}
                                    onChange={(val) => onColumnFilterChange(columnId, val)}
                                    onClear={() => onColumnFilterChange(columnId, '')}
                                    onClose={() => onActiveFilterPopoverChange(null)}
                                />
                            )}
                        </div>
                    )}
                </div>
              </div>
              <div
                  onMouseDown={(e) => onMouseDown(e, columnId)}
                  className="resizer"
                />
            </th>
          );
        })}
      </tr>
    </thead>
  );
};

export default TableHeader;