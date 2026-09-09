import React, { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { InvoiceLineItem } from '@/types';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

// A Cuenta de Terceros Component (Simplified)
const ThirdPartyAccount: React.FC<{ data: NonNullable<InvoiceLineItem['aCuentaTerceros']>; onChange: (updates: NonNullable<InvoiceLineItem['aCuentaTerceros']>) => void; }> = ({ data, onChange }) => {
    const { t } = useTranslation();
    const handleChange = (field: string, value: string) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className="p-4 bg-slate-200 dark:bg-slate-700/50 rounded-md grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label={t('pages.invoice.form.rfc')} value={data.rfc} onChange={e => handleChange('rfc', e.target.value)} />
            <Input label={t('pages.invoice.form.name')} value={data.nombre} onChange={e => handleChange('nombre', e.target.value)} />
            <Input label={t('pages.invoice.form.taxRegime')} value={data.regimenFiscal} onChange={e => handleChange('regimenFiscal', e.target.value)} />
            <Input label={t('pages.invoice.form.fiscalAddress')} value={data.domicilioFiscal} onChange={e => handleChange('domicilioFiscal', e.target.value)} />
        </div>
    );
};

// Información Aduanera Component (Simplified)
const CustomsInfo: React.FC<{ data: NonNullable<InvoiceLineItem['informacionAduanera']>; onChange: (newData: NonNullable<InvoiceLineItem['informacionAduanera']>) => void; }> = ({ data, onChange }) => {
    const { t } = useTranslation();

    const handleUpdate = (index: number, value: string) => {
        const newData = [...data];
        newData[index] = { numeroPedimento: value };
        onChange(newData);
    };

    const handleAdd = () => onChange([...data, { numeroPedimento: '' }]);
    const handleRemove = (index: number) => onChange(data.filter((_, i) => i !== index));

    return (
        <div className="p-4 bg-slate-200 dark:bg-slate-700/50 rounded-md space-y-2">
            {data.map((info, i) => (
                <div key={i} className="flex items-center gap-2">
                    <Input label={`${t('pages.invoice.form.pedimentoNumber')} #${i + 1}`} value={info.numeroPedimento} onChange={e => handleUpdate(i, e.target.value)} wrapperClassName="flex-grow" />
                    <Button size="sm" variant="danger" onClick={() => handleRemove(i)} className="!mt-6"><i className="fa-solid fa-trash"></i></Button>
                </div>
            ))}
            <Button variant="secondary" size="sm" onClick={handleAdd}>{t('pages.invoice.form.addPedimento')}</Button>
        </div>
    );
};

// Cuenta Predial Component (Simplified)
const PropertyTaxAccount: React.FC<{ data: NonNullable<InvoiceLineItem['cuentaPredial']>; onChange: (updates: NonNullable<InvoiceLineItem['cuentaPredial']>) => void; }> = ({ data, onChange }) => {
    const { t } = useTranslation();
    return (
        <div className="p-4 bg-slate-200 dark:bg-slate-700/50 rounded-md">
            <Input label={t('pages.invoice.form.propertyNumber')} value={data.numero} onChange={e => onChange({ numero: e.target.value })} />
        </div>
    );
};

// Partes Component (Simplified)
const PartItem: React.FC<{ part: Partial<InvoiceLineItem>; onUpdate: (updates: Partial<InvoiceLineItem>) => void; onRemove: () => void; index: number; }> = ({ part, onUpdate, onRemove, index }) => {
    const { t } = useTranslation();
    const handleChange = (field: keyof InvoiceLineItem, value: any) => {
        const newPart = { ...part, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
            const quantity = field === 'quantity' ? Number(value) : (newPart.quantity || 0);
            const unitPrice = field === 'unitPrice' ? Number(value) : (newPart.unitPrice || 0);
            newPart.amount = quantity * unitPrice;
        }
        onUpdate(newPart);
    };

    return (
        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-md space-y-2 relative border dark:border-slate-600">
            <h5 className="font-bold text-sm">{t('pages.invoice.form.part')} #{index + 1}</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input label={t('pages.invoice.form.description')} value={part.description || ''} onChange={e => handleChange('description', e.target.value)} />
                <Input label={t('pages.invoice.form.identificationNumber')} value={part.noIdentificacion || ''} onChange={e => handleChange('noIdentificacion', e.target.value)} />
                <Input label="ClaveProdServ" value={part.productCode || ''} onChange={e => handleChange('productCode', e.target.value)} />
                <Input label="ClaveUnidad" value={part.unitCode || ''} onChange={e => handleChange('unitCode', e.target.value)} />
                <Input label={t('pages.invoice.form.quantity')} type="number" value={part.quantity || 0} onChange={e => handleChange('quantity', Number(e.target.value))} />
                <Input label={t('pages.invoice.form.unitPrice')} type="number" value={part.unitPrice || 0} onChange={e => handleChange('unitPrice', Number(e.target.value))} />
            </div>
            <div className="text-right font-semibold">
                {t('pages.invoice.form.amount')}: ${(part.amount || 0).toFixed(2)}
            </div>
            <button type="button" onClick={onRemove} className="absolute top-2 right-2 h-6 w-6 text-slate-400 hover:text-red-500">
                <i className="fa-solid fa-times"></i>
            </button>
        </div>
    );
};

const Parts: React.FC<{ data: NonNullable<InvoiceLineItem['partes']>; onChange: (newData: NonNullable<InvoiceLineItem['partes']>) => void; }> = ({ data, onChange }) => {
    const { t } = useTranslation();
    const handleAdd = () => {
        const newPart: Partial<InvoiceLineItem> = {
            id: `part-${Date.now()}`, quantity: 1, unitPrice: 0, amount: 0, description: '', productCode: '01010101',
        };
        onChange([...data, newPart]);
    };
    const handleUpdate = (index: number, updates: Partial<InvoiceLineItem>) => {
        const newParts = [...data];
        newParts[index] = { ...newParts[index], ...updates };
        onChange(newParts);
    };
    const handleRemove = (index: number) => onChange(data.filter((_, i) => i !== index));

    return (
        <div className="p-4 bg-slate-200 dark:bg-slate-700/50 rounded-md space-y-2">
            {data.map((part, i) => (
                <PartItem key={part.id || i} part={part} index={i} onUpdate={(updates) => handleUpdate(i, updates)} onRemove={() => handleRemove(i)} />
            ))}
            <Button variant="secondary" size="sm" onClick={handleAdd}>{t('pages.invoice.form.addPart')}</Button>
        </div>
    );
};

interface LineItemAdvancedOptionsProps {
    isOpen: boolean;
    onToggle: () => void;
    item: InvoiceLineItem;
    index: number;
    onItemChange: (index: number, updates: Partial<InvoiceLineItem>) => void;
}

type TabId = 'terceros' | 'aduanera' | 'predial' | 'partes';

const LineItemAdvancedOptions: React.FC<LineItemAdvancedOptionsProps> = ({ isOpen, onToggle, item, index, onItemChange }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<TabId>('terceros');

    const handleTabClick = (tabId: TabId) => {
        setActiveTab(tabId);
        // Initialize data if it doesn't exist when tab is clicked
        if (tabId === 'terceros' && !item.aCuentaTerceros) {
            onItemChange(index, { aCuentaTerceros: { rfc: '', nombre: '', regimenFiscal: '', domicilioFiscal: '' } });
        } else if (tabId === 'aduanera' && (!item.informacionAduanera || item.informacionAduanera.length === 0)) {
            onItemChange(index, { informacionAduanera: [{ numeroPedimento: '' }] });
        } else if (tabId === 'predial' && !item.cuentaPredial) {
            onItemChange(index, { cuentaPredial: { numero: '' } });
        } else if (tabId === 'partes' && (!item.partes || item.partes.length === 0)) {
            onItemChange(index, { partes: [{ id: `part-${Date.now()}`, quantity: 1, unitPrice: 0, amount: 0, description: '', productCode: '01010101' }] });
        }
    };

    const tabs = [
        { id: 'terceros', label: t('pages.invoice.form.thirdPartyAccount') },
        { id: 'aduanera', label: t('pages.invoice.form.customsInfo') },
        { id: 'predial', label: t('pages.invoice.form.propertyTaxAccount') },
        { id: 'partes', label: t('pages.invoice.form.parts') },
    ];

    const TabButton: React.FC<{ tabId: TabId, children: React.ReactNode }> = ({ tabId, children }) => (
        <button
            type="button"
            onClick={() => handleTabClick(tabId)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 ${activeTab === tabId ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            {children}
        </button>
    );

    return (
        <div className="mt-2">
            <button type="button" onClick={onToggle} className="text-sm font-semibold text-primary-600 flex items-center gap-2">
                <span>{t('pages.invoice.form.additionalDetails')}</span>
                <i className={`fa-solid fa-chevron-down transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
            </button>
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[2000px] pt-4' : 'max-h-0'}`}>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <div className="border-b border-slate-200 dark:border-slate-700 flex items-center">
                        {tabs.map(tab => <TabButton key={tab.id} tabId={tab.id as TabId}>{tab.label}</TabButton>)}
                    </div>
                    <div className="p-4">
                        {activeTab === 'terceros' && item.aCuentaTerceros && <ThirdPartyAccount data={item.aCuentaTerceros} onChange={newData => onItemChange(index, { aCuentaTerceros: newData })} />}
                        {activeTab === 'aduanera' && item.informacionAduanera && <CustomsInfo data={item.informacionAduanera} onChange={newData => onItemChange(index, { informacionAduanera: newData })} />}
                        {activeTab === 'predial' && item.cuentaPredial && <PropertyTaxAccount data={item.cuentaPredial} onChange={newData => onItemChange(index, { cuentaPredial: newData })} />}
                        {activeTab === 'partes' && item.partes && <Parts data={item.partes} onChange={newData => onItemChange(index, { partes: newData })} />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LineItemAdvancedOptions;