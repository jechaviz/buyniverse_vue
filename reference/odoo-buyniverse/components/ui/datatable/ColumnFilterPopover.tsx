import React, { useRef, useEffect } from 'react';
import Input from '../Input';
import Button from '../Button';
import { useTranslation } from '@/hooks/useTranslation';

interface ColumnFilterPopoverProps {
    columnId: string;
    value: string;
    onChange: (value: string) => void;
    onClear: () => void;
    onClose: () => void;
}

export const ColumnFilterPopover: React.FC<ColumnFilterPopoverProps> = ({ value, onChange, onClear, onClose }) => {
    const { t } = useTranslation();
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <div ref={popoverRef} className="absolute z-10 top-full right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg p-2 animate-fade-in">
            <Input
                autoFocus
                placeholder="Filter..."
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="!py-1.5 text-sm"
            />
            <div className="text-right mt-2">
                <Button variant="ghost" size="sm" onClick={onClear}>{t('common.table.clearColumnFilter')}</Button>
            </div>
        </div>
    );
};