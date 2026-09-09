import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import Modal from '../Modal';
import { ColumnDef } from './types';
import { FilterGroup, FilterRule, Operator } from '@/types';
import Button from '../Button';

interface SettingsModalProps<TData> {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnDef<TData>[];
  columnVisibility: Record<string, boolean>;
  onColumnVisibilityChange: (visibility: Record<string, boolean>) => void;
  filterGroup: FilterGroup;
  onFilterGroupChange: (group: FilterGroup) => void;
  sorting: { id: string, desc: boolean }[];
  onSortingChange: (sorting: { id: string, desc: boolean }[]) => void;
  groupByColumns: string[];
  onGroupByColumnsChange: (columns: string[]) => void;
}

const FilterRuleComponent: React.FC<{ rule: FilterRule, onUpdate: (rule: FilterRule) => void, onRemove: () => void, columns: ColumnDef<any>[] }> = ({ rule, onUpdate, onRemove, columns }) => {
    const { t } = useTranslation();
    const operators: Operator[] = ['contains', 'doesNotContain', 'is', 'isNot', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty', 'equals', 'notEquals', 'greaterThan', 'lessThan'];
    return (
        <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-700 rounded">
            <select value={rule.columnId} onChange={e => onUpdate({ ...rule, columnId: e.target.value })} className="p-1 border rounded text-sm dark:bg-slate-600 dark:border-slate-500">
                {columns.filter(c => c.enableFiltering).map(c => <option key={String(c.accessorKey)} value={String(c.accessorKey)}>{String(c.header())}</option>)}
            </select>
            <select value={rule.operator} onChange={e => onUpdate({ ...rule, operator: e.target.value as Operator })} className="p-1 border rounded text-sm dark:bg-slate-600 dark:border-slate-500">
                {operators.map(op => <option key={op} value={op}>{t(`common.table.operators.${op}`)}</option>)}
            </select>
            <input type="text" value={rule.value} onChange={e => onUpdate({ ...rule, value: e.target.value })} className="flex-grow p-1 border rounded text-sm dark:bg-slate-600 dark:border-slate-500"/>
            <Button size="sm" variant="danger" onClick={onRemove} className="!p-1 h-6 w-6"><i className="fa-solid fa-times text-xs"></i></Button>
        </div>
    );
};

const FilterGroupComponent: React.FC<{ group: FilterGroup, onUpdate: (group: FilterGroup) => void, onRemove?: () => void, columns: ColumnDef<any>[] }> = ({ group, onUpdate, onRemove, columns }) => {
    const { t } = useTranslation();
    
    const handleLogicChange = (logic: 'AND' | 'OR') => onUpdate({ ...group, logic });
    
    const addFilter = (type: 'rule' | 'group') => {
        const newFilter = type === 'rule'
            ? { id: String(Date.now()), columnId: String(columns[0].accessorKey), operator: 'contains' as Operator, value: '' }
            : { id: String(Date.now()), logic: 'AND' as 'AND' | 'OR', filters: [] };
        onUpdate({ ...group, filters: [...group.filters, newFilter] });
    };

    const updateFilter = (filter: FilterRule | FilterGroup, index: number) => {
        const newFilters = [...group.filters];
        newFilters[index] = filter;
        onUpdate({ ...group, filters: newFilters });
    };

    const removeFilter = (index: number) => {
        const newFilters = group.filters.filter((_, i) => i !== index);
        onUpdate({ ...group, filters: newFilters });
    };

    return (
        <div className="p-3 border-l-2 border-slate-300 dark:border-slate-600 space-y-3 bg-slate-50 dark:bg-slate-800/50 rounded">
            <div className="flex items-center gap-2">
                <div className="inline-flex rounded-md shadow-sm">
                    <button type="button" onClick={() => handleLogicChange('AND')} className={`px-2 py-1 text-xs font-medium border ${group.logic === 'AND' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-700'}`}>{t('common.table.and')}</button>
                    <button type="button" onClick={() => handleLogicChange('OR')} className={`px-2 py-1 text-xs font-medium border ${group.logic === 'OR' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-700'}`}>{t('common.table.or')}</button>
                </div>
                {onRemove && <Button size="sm" variant="danger" onClick={onRemove} className="!p-1 h-6 w-6"><i className="fa-solid fa-times text-xs"></i></Button>}
            </div>
            <div className="space-y-2">
                {group.filters.map((filter, index) => (
                    'logic' in filter
                        ? <FilterGroupComponent key={filter.id} group={filter} onUpdate={(g) => updateFilter(g, index)} onRemove={() => removeFilter(index)} columns={columns} />
                        : <FilterRuleComponent key={filter.id} rule={filter} onUpdate={(r) => updateFilter(r, index)} onRemove={() => removeFilter(index)} columns={columns} />
                ))}
            </div>
             <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => addFilter('rule')}>{t('common.table.addFilter')}</Button>
                <Button size="sm" variant="secondary" onClick={() => addFilter('group')}>{t('common.table.addGroup')}</Button>
            </div>
        </div>
    );
};


const SettingsModal = <TData extends { [key: string]: any }>({
  isOpen,
  onClose,
  columns,
  columnVisibility,
  onColumnVisibilityChange,
  filterGroup,
  onFilterGroupChange,
  sorting,
  onSortingChange,
  groupByColumns,
  onGroupByColumnsChange,
}: SettingsModalProps<TData>) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('visibility');
  const [localFilters, setLocalFilters] = useState(filterGroup);
  const [localSorting, setLocalSorting] = useState(sorting);
  const [localGroupBy, setLocalGroupBy] = useState(groupByColumns);

  useEffect(() => {
    if (isOpen) {
        setLocalFilters(filterGroup);
        setLocalSorting(sorting);
        setLocalGroupBy(groupByColumns);
    }
  }, [isOpen, filterGroup, sorting, groupByColumns]);

  const handleApply = () => {
    onFilterGroupChange(localFilters);
    onSortingChange(localSorting);
    onGroupByColumnsChange(localGroupBy);
    onClose();
  };
  
  const handleVisibilityToggle = (key: string) => {
    onColumnVisibilityChange({
      ...columnVisibility,
      [key]: columnVisibility.hasOwnProperty(key) ? !columnVisibility[key] : false,
    });
  };

  const handleAddSort = () => setLocalSorting([...localSorting, { id: '', desc: false }]);
  const handleRemoveSort = (index: number) => setLocalSorting(localSorting.filter((_, i) => i !== index));
  const handleUpdateSort = (index: number, newSort: {id: string, desc: boolean}) => {
      setLocalSorting(localSorting.map((s, i) => i === index ? newSort : s));
  };
  
  const handleGroupByToggle = (columnId: string) => {
      setLocalGroupBy(prev => prev.includes(columnId) ? prev.filter(c => c !== columnId) : [...prev, columnId]);
  }

  const tabClass = (tabName: string) => `px-4 py-2 font-semibold rounded-t-lg transition-colors ${activeTab === tabName ? 'border-b-2 border-primary-600 text-primary-600' : 'text-slate-500 hover:text-slate-800'}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('common.table.settings')}>
      <div className="flex border-b mb-4">
        <button className={tabClass('visibility')} onClick={() => setActiveTab('visibility')}>{t('common.table.fieldVisibility')}</button>
        <button className={tabClass('filter')} onClick={() => setActiveTab('filter')}>{t('common.table.filter')}</button>
        <button className={tabClass('sort')} onClick={() => setActiveTab('sort')}>{t('common.table.sort')}</button>
        <button className={tabClass('group')} onClick={() => setActiveTab('group')}>{t('common.table.groupBy')}</button>
      </div>
      <div className="min-h-[250px]">
        {activeTab === 'visibility' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {columns.map(col => {
                const key = String(col.accessorKey);
                if(key === 'action' || key === 'id') return null;
                return (
                <label key={key} className="flex items-center gap-2 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                    <input type="checkbox" checked={!columnVisibility[key]} onChange={() => handleVisibilityToggle(key)} className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"/>
                    <span className="text-sm">{String(col.header())}</span>
                </label>
                );
            })}
            </div>
        )}
         {activeTab === 'filter' && (
            <FilterGroupComponent group={localFilters} onUpdate={setLocalFilters} columns={columns} />
         )}
         {activeTab === 'sort' && (
             <div className="space-y-2">
                {localSorting.map((sort, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-700 rounded">
                        <select value={sort.id} onChange={e => handleUpdateSort(index, {...sort, id: e.target.value})} className="flex-grow p-1 border rounded text-sm dark:bg-slate-600 dark:border-slate-500">
                            <option value="">{t('common.table.sortBy')}</option>
                            {columns.filter(c => c.enableSorting).map(c => <option key={String(c.accessorKey)} value={String(c.accessorKey)}>{String(c.header())}</option>)}
                        </select>
                        <select value={sort.desc ? 'desc' : 'asc'} onChange={e => handleUpdateSort(index, {...sort, desc: e.target.value === 'desc'})} className="p-1 border rounded text-sm dark:bg-slate-600 dark:border-slate-500">
                             <option value="asc">{t('common.table.asc')}</option>
                             <option value="desc">{t('common.table.desc')}</option>
                        </select>
                        <Button size="sm" variant="danger" onClick={() => handleRemoveSort(index)} className="!p-1 h-6 w-6"><i className="fa-solid fa-times text-xs"></i></Button>
                    </div>
                ))}
                 <Button onClick={handleAddSort} variant="secondary">{t('common.table.addSort')}</Button>
             </div>
         )}
         {activeTab === 'group' && (
             <div className="space-y-2">
                <h4 className="font-semibold">{t('common.table.groupByColumns')}</h4>
                 {columns.filter(c => c.enableFiltering).map(c => {
                     const columnId = String(c.accessorKey);
                     return (
                        <label key={columnId} className="flex items-center gap-2 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer">
                            <input type="checkbox" checked={localGroupBy.includes(columnId)} onChange={() => handleGroupByToggle(columnId)} className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"/>
                            <span className="text-sm">{String(c.header())}</span>
                        </label>
                     )
                 })}
            </div>
         )}
      </div>
      <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleApply}>{t('common.apply')}</Button>
      </div>
    </Modal>
  );
};

export default SettingsModal;