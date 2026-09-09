import React from 'react';
import { ColumnDef } from '@/components/ui/DataTable';
import { User } from '@/types';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StarInput from '@/components/ui/StarInput';
import MultiUserSelector from './MultiUserSelector';
import TagInput from '@/components/ui/TagInput';

interface DataFormProps<TData> {
    title: string;
    columns: ColumnDef<TData>[];
    draftData: Partial<TData>;
    onUpdate: (key: keyof TData, value: any) => void;
    onSave: () => void;
    onCancel: () => void;
    users: User[];
}

const DataForm = <TData extends { [key: string]: any }>({
    title,
    columns,
    draftData,
    onUpdate,
    onSave,
    onCancel,
    users,
}: DataFormProps<TData>) => {
    
    const renderField = (col: ColumnDef<TData>) => {
        if (!col.editConfig || col.accessorKey === 'action' || String(col.accessorKey) === 'id') return null;
        
        const key = col.accessorKey as keyof TData;
        const value = draftData[key] ?? '';
        const header = typeof col.header === 'function' ? col.header() : String(col.header);

        switch(col.editConfig.type) {
            case 'text':
                if (String(key).toLowerCase().includes('description')) {
                    return <Textarea label={String(header)} value={value} onChange={e => onUpdate(key, e.target.value)} rows={5} />;
                }
                return <Input label={String(header)} value={value} onChange={e => onUpdate(key, e.target.value)} />;
            case 'number':
                return <Input type="number" label={String(header)} value={value} onChange={e => onUpdate(key, Number(e.target.value))} />;
            case 'select':
                return (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{String(header)}</label>
                        <select value={value} onChange={e => onUpdate(key, e.target.value)} className="block w-full px-4 py-2 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700/50 focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm">
                             {col.editConfig.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                );
             case 'tags':
                return <TagInput label={String(header)} tags={Array.isArray(value) ? value : []} onTagsChange={tags => onUpdate(key, tags)} />;
            case 'rating':
                return (
                    <div>
                         <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{String(header)}</label>
                         <StarInput rating={value || 0} onRatingChange={rating => onUpdate(key, rating)} />
                    </div>
                );
            case 'multi-user':
                 return <MultiUserSelector allUsers={users} selectedUserIds={value || []} onSelectionChange={ids => onUpdate(key, ids)} label={String(header)} />;
            default:
                 return <Input label={String(header)} value={value} onChange={e => onUpdate(key, e.target.value)} />;
        }
    }

    return (
        <Card>
            <div className="p-4 border-b">
                <h2 className="text-xl font-bold">{title}</h2>
            </div>
            <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                    {columns.filter(c => c.editConfig && String(c.accessorKey) !== 'id').map(col => (
                        <div key={String(col.accessorKey)}>
                            {renderField(col)}
                        </div>
                    ))}
                </div>
            </div>
            <div className="p-4 flex justify-end gap-2 border-t">
                <Button variant="secondary" onClick={onCancel}>Cancel</Button>
                <Button onClick={onSave}>Save</Button>
            </div>
        </Card>
    );
};

export default DataForm;
