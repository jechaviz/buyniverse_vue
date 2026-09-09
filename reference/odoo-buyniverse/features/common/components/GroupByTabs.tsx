import React from 'react';
import { ColumnDef } from '@/components/ui/DataTable';

interface GroupByTabsProps<TData> {
    data: TData[];
    groupByColumns: string[];
    columns: ColumnDef<TData>[];
    activeFilters: Record<string, string>;
    onFilterChange: (filters: Record<string, string>) => void;
}

const GroupByTabs = <TData extends { [key: string]: any }>({
    data,
    groupByColumns,
    columns,
    activeFilters,
    onFilterChange
}: GroupByTabsProps<TData>) => {

    const getGroupedData = (level: number, parentFilters: Record<string, string>) => {
        const columnId = groupByColumns[level];
        if (!columnId) return [];

        let filteredData = data;
        if (Object.keys(parentFilters).length > 0) {
            filteredData = data.filter(row => {
                return Object.entries(parentFilters).every(([key, value]) => String(row[key]) === value);
            });
        }

        const counts = filteredData.reduce((acc, row) => {
            const value = String(row[columnId]);
            acc[value] = (acc[value] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(counts).map(([value, count]) => ({ value, count }));
    };
    
    const handleTabClick = (columnId: string, value: string | null, level: number) => {
        const newFilters = { ...activeFilters };
        
        // Clear deeper level filters
        for(let i = level + 1; i < groupByColumns.length; i++) {
            delete newFilters[groupByColumns[i]];
        }

        if (value === null || newFilters[columnId] === value) {
            delete newFilters[columnId];
        } else {
            newFilters[columnId] = value;
        }

        onFilterChange(newFilters);
    };


    return (
        <div className="mb-4 space-y-2">
            {groupByColumns.map((columnId, level) => {
                const parentFilters: Record<string, string> = {};
                for(let i=0; i < level; i++) {
                    const parentCol = groupByColumns[i];
                    if(activeFilters[parentCol]) {
                        parentFilters[parentCol] = activeFilters[parentCol];
                    }
                }
                const tabs = getGroupedData(level, parentFilters);
                const totalCount = tabs.reduce((sum, tab) => sum + tab.count, 0);
                const activeTabValue = activeFilters[columnId];
                const columnHeader = columns.find(c => String(c.accessorKey) === columnId)?.header() || columnId;

                return (
                    <div key={columnId} className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2 overflow-x-auto">
                        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">{columnHeader}:</span>
                        <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => handleTabClick(columnId, null, level)}
                                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${!activeTabValue ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'}`}
                            >
                                <span>All</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs ${!activeTabValue ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-600'}`}>{totalCount}</span>
                            </button>
                            {tabs.map(({ value, count }) => (
                                <button
                                    key={value}
                                    onClick={() => handleTabClick(columnId, value, level)}
                                    className={`flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${activeTabValue === value ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'}`}
                                >
                                    <span>{value}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${activeTabValue === value ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-600'}`}>{count}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default GroupByTabs;