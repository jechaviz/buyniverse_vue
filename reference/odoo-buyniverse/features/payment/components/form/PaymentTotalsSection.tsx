import React, { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { PaymentReceipt } from '@/types';
import CollapsibleCard from '@/components/ui/CollapsibleCard';
import { formatCurrency } from '@/utils/formatters';

interface PaymentTotalsSectionProps {
    totals: PaymentReceipt['totals'];
    currency: string;
}

const PaymentTotalsSection: React.FC<PaymentTotalsSectionProps> = ({ totals, currency }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(true);

    return (
        <CollapsibleCard title={t('pages.payment.form.totalsSection.title')} isOpen={isOpen} onToggle={() => setIsOpen(!isOpen)}>
            <div className="max-w-md ml-auto space-y-2 text-sm">
                {Object.entries(totals)
                    .filter(([key, value]) => value !== 0)
                    .map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                        <span className="text-slate-500">{t(`pages.payment.form.totalsSection.${key}`)}</span>
                        <span className="font-mono">{formatCurrency(value as number, currency)}</span>
                    </div>
                ))}
            </div>
        </CollapsibleCard>
    );
};

export default PaymentTotalsSection;