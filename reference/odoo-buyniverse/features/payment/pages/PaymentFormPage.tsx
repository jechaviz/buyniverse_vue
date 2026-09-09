import React from 'react';
import { useParams } from 'react-router-dom';
import { useAppState } from '@/context/AppStateContext';
import PaymentForm from '../components/PaymentForm';
import { useTranslation } from '@/hooks/useTranslation';

const PaymentFormPage: React.FC = () => {
    const { paymentId } = useParams<{ paymentId?: string }>();
    const { paymentReceipts } = useAppState();
    const { t } = useTranslation();
    
    const paymentToEdit = paymentId ? paymentReceipts.find(p => p.id === paymentId) : undefined;
    const isEditing = !!paymentToEdit;

    return (
        <>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-6">
                {isEditing ? t('pages.payment.form.editTitle') : t('pages.payment.form.createTitle')}
            </h1>
            <PaymentForm paymentToEdit={paymentToEdit} />
        </>
    );
};

export default PaymentFormPage;