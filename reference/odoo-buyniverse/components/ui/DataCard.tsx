import React from 'react';
import Card from './Card';
import { ColumnDef } from './DataTable';
import { AICardLayoutConfig } from '@/services/geminiService';

interface DataCardProps<TData> {
  row: TData;
  columns: ColumnDef<TData>[];
  layoutConfig: AICardLayoutConfig | null;
}

export const DataCard = <TData extends { [key: string]: any }>({ row, columns, layoutConfig }: DataCardProps<TData>) => {
  const getColumnByKey = (key: string) => columns.find(c => String(c.accessorKey) === key);

  if (!layoutConfig) {
    // Fallback rendering if AI layout is not available
    const fallbackTitle = row[columns[1]?.accessorKey];
    return (
      <Card className="p-4 m-2">
        <div className="font-bold text-lg mb-2">{fallbackTitle ? String(fallbackTitle) : `Item ${row.id}`}</div>
        <div className="space-y-1 text-sm">
          {columns.slice(2, 6).map(col => (
            <div key={String(col.accessorKey)} className="flex justify-between">
              <span className="text-slate-500">{col.header()}</span>
              <span className="font-medium text-right">{col.cell({ row })}</span>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const { title, subtitle, body, footer } = layoutConfig;
  const titleCol = getColumnByKey(title);
  const subtitleCol = subtitle ? getColumnByKey(subtitle) : undefined;
  const bodyCols = body.map(getColumnByKey).filter(Boolean) as ColumnDef<TData>[];
  const footerCols = footer.map(getColumnByKey).filter(Boolean) as ColumnDef<TData>[];

  return (
    <Card className="p-4 flex flex-col h-full">
      <div className="flex-grow">
        {titleCol && <div className="font-bold text-lg mb-1">{titleCol.cell({ row })}</div>}
        {subtitleCol && <div className="text-sm text-slate-500 mb-3">{subtitleCol.cell({ row })}</div>}
        <div className="space-y-2 text-sm">
          {bodyCols.map(col => (
            <div key={String(col.accessorKey)} className="flex justify-between items-start gap-2">
              <span className="text-slate-500">{col.header()}</span>
              <span className="font-medium text-right">{col.cell({ row })}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-sm gap-4">
        {footerCols.map(col => (
          <div key={String(col.accessorKey)}>{col.cell({ row })}</div>
        ))}
      </div>
    </Card>
  );
};

export default DataCard;
