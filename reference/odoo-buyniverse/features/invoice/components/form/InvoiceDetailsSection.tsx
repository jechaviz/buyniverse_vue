import React, { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Invoice } from '@/types';
import CollapsibleCard from '@/components/ui/CollapsibleCard';
import Input from '@/components/ui/Input';
import { catalogs } from '../../lib/catalogs';

interface InvoiceDetailsSectionProps {
    invoice: Partial<Invoice>;
    updateInvoice: (updates: Partial<Invoice>) => void;
}

const InvoiceDetailsSection: React.FC<InvoiceDetailsSectionProps> = ({ invoice, updateInvoice }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(true);

    return (
        <CollapsibleCard title={t('pages.invoice.form.details')} isOpen={isOpen} onToggle={() => setIsOpen(!isOpen)}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                <Input label={t('pages.invoice.form.date')} type="datetime-local" value={invoice.date ? new Date(new Date(invoice.date).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''} onChange={e => updateInvoice({ date: new Date(e.target.value) })} />
                <div className="grid grid-cols-2 gap-2">
                    <Input label={t('pages.invoice.form.serie')} value={invoice.serie || ''} onChange={e => updateInvoice({ serie: e.target.value })} />
                    <Input label={t('pages.invoice.form.folio')} value={invoice.folio || ''} onChange={e => updateInvoice({ folio: e.target.value })} />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">{t('pages.invoice.form.cfdiUse')}</label>
                    <select value={invoice.cfdiUse} onChange={e => updateInvoice({ cfdiUse: e.target.value })} className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600">
                        {Object.entries(catalogs.UsoCFDI).map(([k, v]) => <option key={k} value={k}>{v} ({k})</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">{t('pages.invoice.form.paymentMethod')}</label>
                    <select value={invoice.paymentMethod} onChange={e => updateInvoice({ paymentMethod: e.target.value as 'PUE' | 'PPD' })} className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600">
                        {Object.entries(catalogs.MetodoPago).map(([k, v]) => <option key={k} value={k}>{v} ({k})</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">{t('pages.invoice.form.paymentType')}</label>
                    <select value={invoice.paymentType} onChange={e => updateInvoice({ paymentType: e.target.value })} className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600">
                        {Object.entries(catalogs.FormaPago).map(([k, v]) => <option key={k} value={k}>{v} ({k})</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('pages.invoice.form.currency')}</label>
                        <select value={invoice.currency} onChange={e => updateInvoice({ currency: e.target.value as any })} className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600">
                            {Object.keys(catalogs.Moneda).map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                    </div>
                    <Input label={t('pages.invoice.form.exchangeRate')} type="number" value={invoice.exchangeRate || 1} onChange={e => updateInvoice({ exchangeRate: Number(e.target.value) })} disabled={invoice.currency === 'USD' || invoice.currency === 'MXN'} />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">{t('pages.invoice.form.export')}</label>
                    <select value={invoice.exportacion} onChange={e => updateInvoice({ exportacion: e.target.value })} className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600">
                        {Object.entries(catalogs.Exportacion).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                </div>
                <Input label={t('pages.invoice.form.paymentConditions')} value={invoice.condicionesDePago || ''} onChange={e => updateInvoice({ condicionesDePago: e.target.value })} />
            </div>
        </CollapsibleCard>
    );
};

export default InvoiceDetailsSection;
