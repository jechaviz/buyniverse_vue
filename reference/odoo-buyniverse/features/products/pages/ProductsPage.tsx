import React, { useState, useMemo } from 'react';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { useTranslation } from '@/hooks/useTranslation';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { Product } from '@/types';
import Tooltip from '@/components/ui/Tooltip';

const ProductsPage: React.FC = () => {
    const { products } = useAppState();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [rowSelection, setRowSelection] = useState({});

    const handlePinToggle = (productId: string) => {
        const product = products.find(p => p.id === productId);
        if (product) {
            dispatch({
                type: 'UPDATE_PRODUCT',
                payload: { id: productId, data: { isPinned: !product.isPinned } }
            });
        }
    };

    const handleUpdateCell = (rowId: string, columnId: string, value: any) => {
        dispatch({ type: 'UPDATE_ENTITY', payload: { entity: 'products', id: rowId, data: { [columnId]: value } } });
    };

    const columns = useMemo<ColumnDef<Product>[]>(() => [
        {
            accessorKey: 'description',
            header: () => t('pages.products.headers.description'),
            cell: ({ row }) => <span className="font-medium text-slate-700 dark:text-slate-200">{row.description}</span>,
            enableSorting: true,
            enableFiltering: true,
            editConfig: { type: 'text' },
        },
        {
            accessorKey: 'rate',
            header: () => t('pages.products.headers.rate'),
            cell: ({ row }) => `$${row.rate.toFixed(2)}`,
            enableSorting: true,
            editConfig: { type: 'number' },
        },
        {
            accessorKey: 'unit',
            header: () => t('pages.products.headers.unit'),
            cell: ({ row }) => row.unit,
            enableSorting: true,
            enableFiltering: true,
            editConfig: { type: 'select', options: [{value: 'Each', label: 'Each'}, {value: 'Hr', label: 'Hr'}] },
        },
        {
            accessorKey: 'category',
            header: () => t('pages.products.headers.category'),
            cell: ({ row }) => row.category,
            enableSorting: true,
            enableFiltering: true,
            editConfig: { type: 'text' },
        },
    ], [t, dispatch]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{t('pages.products.title', { defaultValue: 'Products' })}</h1>
            <DataTable
                columns={columns}
                data={products}
                globalFilter={searchTerm}
                onGlobalFilterChange={setSearchTerm}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                idKey="id"
                onUpdateCell={handleUpdateCell}
                enableCrud
                pageTitle="Products"
            />
        </div>
    );
};

export default ProductsPage;