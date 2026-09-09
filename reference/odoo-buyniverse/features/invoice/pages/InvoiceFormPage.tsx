import React from 'react';
import { useParams } from 'react-router-dom';
import { useAppState } from '@/context/AppStateContext';
import { InvoiceForm } from '@/features/invoice';
import { useTranslation } from '@/hooks/useTranslation';

const InvoiceFormPage: React.FC = () => {
    const { invoiceId } = useParams<{ invoiceId?: string }>();
    const { invoices } = useAppState();
    const { t } = useTranslation();
    
    const invoiceToEdit = invoiceId ? invoices.find(inv => inv.id === invoiceId) : undefined;
    const isEditing = !!invoiceToEdit;

    return (
        <>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-6">
                {isEditing ? t('pages.invoice.form.editTitle') : t('pages.invoice.form.createTitle')}
            </h1>
            <InvoiceForm invoiceToEdit={invoiceToEdit} />
        </>
    );
};

export default InvoiceFormPage;