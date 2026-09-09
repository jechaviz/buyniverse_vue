import React, { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { PaymentReceipt } from '@/types';
import CollapsibleCard from '@/components/ui/CollapsibleCard';
import Input from '@/components/ui/Input';
import { catalogs } from '@/features/invoice/lib/catalogs';

interface PaymentDetailsSectionProps {
    payment: Partial<PaymentReceipt>;
    updatePayment: (updates: Partial<PaymentReceipt>) => void;
}

const PaymentDetailsSection: React.FC<PaymentDetailsSectionProps> = ({ payment, updatePayment }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(true);

    return (
        <CollapsibleCard title={t('pages.payment.form.paymentDetails')} isOpen={isOpen} onToggle={() => setIsOpen(!isOpen)}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                <Input label={t('pages.payment.form.paymentDate')} type="datetime-local" value={payment.date ? new Date(new Date(payment.date).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''} onChange={e => updatePayment({ date: new Date(e.target.value) })} />
                <div>
                    <label className="block text-sm font-medium mb-1">{t('pages.payment.form.paymentType')}</label>
                    <select value={payment.paymentType} onChange={e => updatePayment({ paymentType: e.target.value })} className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600">
                        {Object.entries(catalogs.FormaPago).map(([k,v]) => <option key={k} value={k}>{v} ({k})</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">{t('pages.payment.form.currency')}</label>
                    <select value={payment.currency} onChange={e => updatePayment({ currency: e.target.value as any})} className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600">
                        {Object.keys(catalogs.Moneda).map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                </div>
                <Input label={t('pages.payment.form.exchangeRate')} type="number" value={payment.exchangeRate || 1} onChange={e => updatePayment({ exchangeRate: Number(e.target.value) })} disabled={payment.currency === 'MXN'} tooltip={t('pages.payment.form.exchangeRateTooltip')} />
            </div>
        </CollapsibleCard>
    );
};

export default PaymentDetailsSection;
