import React, { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Invoice } from '@/types';
import CollapsibleCard from '@/components/ui/CollapsibleCard';
import Input from '@/components/ui/Input';
import { catalogs } from '../../lib/catalogs';

interface GlobalInfoSectionProps {
    invoice: Partial<Invoice>;
    updateInvoice: (updates: Partial<Invoice>) => void;
}

const GlobalInfoSection: React.FC<GlobalInfoSectionProps> = ({ invoice, updateInvoice }) => {
    const { t } = useTranslation();
    const [isGlobal, setIsGlobal] = useState(!!invoice.informacionGlobal);

    const handleToggle = (checked: boolean) => {
        setIsGlobal(checked);
        if (!checked) {
            const { informacionGlobal, ...rest } = invoice;
            updateInvoice(rest);
        } else {
            updateInvoice({
                informacionGlobal: {
                    periodicidad: '04', // Mensual
                    meses: new Date().getMonth().toString().padStart(2, '0'),
                    año: new Date().getFullYear(),
                },
                receiver: {
                    ...(invoice.receiver || {}),
                    rfc: 'XAXX010101000',
                    nombre: 'PUBLICO EN GENERAL',
                    domicilioFiscal: invoice.issuer?.postalCode,
                    regimenFiscal: '616',
                    cfdiUse: 'S01'
                } as any
            });
        }
    }

    if (invoice.receiver?.rfc && invoice.receiver.rfc !== 'XAXX010101000' && !isGlobal) {
        return null;
    }

    return (
        <CollapsibleCard title={t('pages.invoice.form.globalInfo')} isOpen={isGlobal} onToggle={() => handleToggle(!isGlobal)}>
             <div className="pt-4 mt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('pages.invoice.form.periodicity')}</label>
                        <select value={invoice.informacionGlobal?.periodicidad || ''} onChange={e => updateInvoice({ informacionGlobal: {...invoice.informacionGlobal, periodicidad: e.target.value} as any })} className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600">
                            {Object.entries(catalogs.Periodicidad).map(([k,v]) => <option key={k} value={k}>{k} - {v}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('pages.invoice.form.months')}</label>
                        <select value={invoice.informacionGlobal?.meses || ''} onChange={e => updateInvoice({ informacionGlobal: {...invoice.informacionGlobal, meses: e.target.value} as any })} className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600">
                            {Object.entries(catalogs.Meses).map(([k,v]) => <option key={k} value={k}>{k} - {v}</option>)}
                        </select>
                    </div>
                    <Input label={t('pages.invoice.form.year')} type="number" value={invoice.informacionGlobal?.año || new Date().getFullYear()} onChange={e => updateInvoice({ informacionGlobal: {...invoice.informacionGlobal, año: Number(e.target.value)} as any })} />
                </div>
            </div>
        </CollapsibleCard>
    );
};

export default GlobalInfoSection;
