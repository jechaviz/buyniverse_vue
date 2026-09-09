import React from 'react';
import { ColumnDef } from '@/components/ui/DataTable';

interface DataDetailViewProps<TData> {
    columns: ColumnDef<TData>[];
    data: TData;
}

const DataDetailView = <TData extends { [key: string]: any }>({
    columns,
    data,
}: DataDetailViewProps<TData>) => {
    
    // Render only columns that have an editConfig, as they represent the data fields
    const fieldsToRender = columns.filter(col => col.editConfig && col.accessorKey !== 'action');

    return (
        <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 max-w-4xl mx-auto">
                {fieldsToRender.map(col => (
                    <div key={String(col.accessorKey)} className="border-b border-slate-200 dark:border-slate-700 pb-2">
                        <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">{String(col.header())}</h4>
                        <div className="mt-1 text-base text-slate-800 dark:text-slate-200 font-semibold break-words">
                            {col.cell({ row: data })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DataDetailView;
