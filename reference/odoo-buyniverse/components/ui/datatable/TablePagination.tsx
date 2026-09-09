
import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface TablePaginationProps {
  pagination: { pageIndex: number, pageSize: number };
  onPaginationChange: (pagination: { pageIndex: number, pageSize: number }) => void;
  pageCount: number;
  rowSelection: Record<string, boolean>;
  totalRows: number;
}

const TablePagination: React.FC<TablePaginationProps> = ({
  pagination,
  onPaginationChange,
  pageCount,
  rowSelection,
  totalRows,
}) => {
  const { t } = useTranslation();
  const { pageIndex, pageSize } = pagination;

  return (
    <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20">
      <div className="text-sm text-slate-600 dark:text-slate-400">
        {Object.keys(rowSelection).length > 0 ? t('common.table.selected', { count: Object.keys(rowSelection).length, total: totalRows }) : null}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm">{t('common.table.page')} {pageIndex + 1} {t('common.table.of')} {pageCount}</span>
        <div className="flex items-center gap-2">
            <button onClick={() => onPaginationChange({ ...pagination, pageIndex: 0 })} disabled={pageIndex === 0} className="p-1 disabled:opacity-50">«</button>
            <button onClick={() => onPaginationChange({ ...pagination, pageIndex: pageIndex - 1 })} disabled={pageIndex === 0} className="p-1 disabled:opacity-50">‹</button>
            <button onClick={() => onPaginationChange({ ...pagination, pageIndex: pageIndex + 1 })} disabled={pageIndex >= pageCount - 1} className="p-1 disabled:opacity-50">›</button>
            <button onClick={() => onPaginationChange({ ...pagination, pageIndex: pageCount - 1 })} disabled={pageIndex >= pageCount - 1} className="p-1 disabled:opacity-50">»</button>
        </div>
      </div>
    </div>
  );
};

export default TablePagination;
