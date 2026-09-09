import React, { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { CfdiTax } from '@/types';
import CollapsibleCard from '@/components/ui/CollapsibleCard';
import { formatCurrency } from '@/utils/formatters';

interface TaxBreakdownTableProps {
    taxes: CfdiTax[];
    title: string;
    currency: string;
}

const TaxBreakdownTable: React.FC<TaxBreakdownTableProps> = ({ taxes, title, currency }) => {
    const { t } = useTranslation();
    if (!taxes || taxes.length === 0) return null;

    return (
        <div>
            <h4 className="text-xs font-semibold text-slate-500 mb-1">{title}</h4>
            <div className="text-xs border rounded-md overflow-hidden dark:border-slate-700">
                <div className="grid grid-cols-4 bg-slate-100 dark:bg-slate-700/50 font-semibold p-1">
                    <div>{t('pages.payment.form.taxSections.type')}</div>
                    <div className="text-right">{t('pages.payment.form.taxSections.rate')}</div>
                    <div className="text-right">{t('pages.payment.form.taxSections.base')}</div>
                    <div className="text-right">{t('pages.payment.form.taxSections.amount')}</div>
                </div>
                {taxes.map((tax, i) => (
                    <div key={i} className="grid grid-cols-4 p-1 border-t dark:border-slate-700">
                        <div>{tax.isRetention ? 'RET' : 'TRAS'} {tax.taxType}</div>
                        <div className="text-right">{(tax.rate * 100).toFixed(2)}%</div>
                        <div className="text-right font-mono">{formatCurrency(tax.base, currency)}</div>
                        <div className={`text-right font-mono ${tax.isRetention ? 'text-red-500' : 'text-green-600'}`}>
                            {tax.isRetention ? '-' : ''}{formatCurrency(tax.amount, currency)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface PaymentTaxesSectionProps {
    taxes: CfdiTax[];
    currency: string;
}

const PaymentTaxesSection: React.FC<PaymentTaxesSectionProps> = ({ taxes, currency }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(true);

    return (
        <CollapsibleCard title={t('pages.payment.form.paymentTaxes')} isOpen={isOpen} onToggle={() => setIsOpen(!isOpen)}>
            <TaxBreakdownTable taxes={taxes} title="" currency={currency} />
        </CollapsibleCard>
    );
};

export default PaymentTaxesSection;
