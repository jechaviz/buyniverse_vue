import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import Card from '@/components/ui/Card';
import { formatCurrency } from '@/utils/formatters';

interface InvoiceTotalsProps {
    totals: {
        subtotal: number;
        discount: number;
        taxTotal: number;
        retainedTotal: number;
        total: number;
    };
    currency: string;
}

const InvoiceTotals: React.FC<InvoiceTotalsProps> = ({ totals, currency }) => {
    const { t } = useTranslation();

    return (
        <Card>
            <div className="p-4 border-b dark:border-slate-700">
                <h3 className="text-lg font-bold">{t('pages.invoice.form.totals')}</h3>
            </div>
            <div className="p-6">
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-slate-500">{t('pages.invoice.totals.subtotal')}</span>
                        <span>{formatCurrency(totals.subtotal, currency)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">{t('pages.invoice.totals.discount')}</span>
                        <span>-{formatCurrency(totals.discount, currency)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">{t('pages.invoice.totals.taxTotal')}</span>
                        <span>{formatCurrency(totals.taxTotal, currency)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">{t('pages.invoice.totals.retainedTotal')}</span>
                        <span>-{formatCurrency(totals.retainedTotal, currency)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base mt-2 pt-2 border-t">
                        <span>{t('pages.invoice.totals.total')}</span>
                        <span>{formatCurrency(totals.total, currency)}</span>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default InvoiceTotals;
