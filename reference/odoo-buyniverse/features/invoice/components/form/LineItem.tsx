import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { InvoiceLineItem, Product, CfdiTax } from '@/types';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { catalogs } from '../../lib/catalogs';
import { getInvoiceLineItemSuggestions } from '@/services/geminiService';
import Spinner from '@/components/ui/Spinner';
import { formatCurrency } from '@/utils/formatters';
import LineItemAdvancedOptions from './LineItemAdvancedOptions';

interface LineItemProps {
    item: InvoiceLineItem;
    index: number;
    onItemChange: (index: number, updates: Partial<InvoiceLineItem>) => void;
    onRemove: (index: number) => void;
    products: Product[];
    setTaxManager: (state: { isOpen: boolean, lineItemIndex: number | null }) => void;
    aiLoading: boolean;
    setAiLoading: (loading: boolean) => void;
    currency: string;
}

const LineItem: React.FC<LineItemProps> = (props) => {
    const { item, index, onItemChange, onRemove, products, setTaxManager, aiLoading, setAiLoading, currency } = props;
    const { t } = useTranslation();
    const [isAdvancedOpen, setAdvancedOpen] = useState(false);
    
    const handleAiSuggest = async () => {
        if (!item.description) return;
        setAiLoading(true);
        try {
            const suggestions = await getInvoiceLineItemSuggestions(item.description);
            onItemChange(index, suggestions);
        } catch (error) {
            console.error("AI Suggestion failed:", error);
            alert("Failed to get AI suggestions.");
        } finally {
            setAiLoading(false);
        }
    };
    
    const totalTaxes = (item.taxes || []).reduce((sum, tax) => sum + (tax.isRetention ? -tax.amount : tax.amount), 0);
    const totalWithTaxes = item.amount + totalTaxes;

    return (
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border dark:border-slate-700/50 relative">
            <div className="space-y-4">
                {/* --- ROW 1 --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium mb-1">{t('pages.invoice.form.productSelect')}</label>
                        <select value={item.productId || ''} onChange={e => onItemChange(index, { productId: e.target.value })} className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 text-sm">
                            <option value="">Seleccionar Producto</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.description}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <Input label={t('pages.invoice.form.description')} value={item.description} onChange={e => onItemChange(index, { description: e.target.value })} />
                    </div>
                </div>

                {/* --- ROW 2 --- */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-12 gap-x-4 gap-y-2 items-end">
                    <div className="col-span-2 sm:col-span-2 lg:col-span-2">
                        <label className="flex items-center gap-1 text-sm font-medium mb-1">
                            *ClaveProdServ
                            <button type="button" onClick={handleAiSuggest} disabled={aiLoading} className="h-5 w-5 rounded-md flex items-center justify-center text-slate-400 hover:text-primary-600">
                                {aiLoading ? <Spinner size="sm" color="border-primary-500"/> : <i className="fa-solid fa-wand-magic-sparkles text-xs"></i>}
                            </button>
                        </label>
                        <Input value={item.productCode} onChange={e => onItemChange(index, { productCode: e.target.value })} />
                    </div>
                    <div className="col-span-2 sm:col-span-2 lg:col-span-2">
                        <label className="flex items-center gap-1 text-sm font-medium mb-1">
                            *ClaveUnidad
                            <button type="button" onClick={handleAiSuggest} disabled={aiLoading} className="h-5 w-5 rounded-md flex items-center justify-center text-slate-400 hover:text-primary-600">
                                {aiLoading ? <Spinner size="sm" color="border-primary-500"/> : <i className="fa-solid fa-wand-magic-sparkles text-xs"></i>}
                            </button>
                        </label>
                        <Input value={item.unitCode} onChange={e => onItemChange(index, { unitCode: e.target.value })} />
                    </div>
                    <div className="col-span-1 lg:col-span-2"><Input label={t('pages.invoice.form.quantity')} type="number" value={item.quantity} onChange={e => onItemChange(index, { quantity: Number(e.target.value) })} /></div>
                    <div className="col-span-1 lg:col-span-2"><Input label={t('pages.invoice.form.unitPrice')} type="number" value={item.unitPrice} onChange={e => onItemChange(index, { unitPrice: Number(e.target.value) })} /></div>
                    <div className="col-span-1 lg:col-span-2"><Input label={t('pages.invoice.form.discount')} type="number" value={item.discount} onChange={e => onItemChange(index, { discount: Number(e.target.value) })} /></div>
                    <div className="col-span-1 lg:col-span-2 text-right">
                        <p className="text-xs text-slate-500">{t('pages.invoice.form.amount')}</p>
                        <p className="font-bold text-lg">{formatCurrency(item.amount, currency)}</p>
                    </div>
                </div>

                {/* --- ROW 3 --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                     <div className="md:col-span-1">
                        <label className="block text-sm font-medium mb-1">Objeto de Impuestos</label>
                        <select value={item.objetoImp} onChange={e => onItemChange(index, { objetoImp: e.target.value })} className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600">
                            {Object.entries(catalogs.ObjetoImp).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                     </div>
                     <div className="md:col-span-1">
                        <a href="#" onClick={(e) => { e.preventDefault(); setTaxManager({ isOpen: true, lineItemIndex: index }); }} className="text-sm font-medium mb-1 text-primary-600 hover:underline">{t('pages.invoice.form.taxes')}</a>
                        <div className="w-full p-2 border rounded-lg bg-white dark:bg-slate-800 h-10 flex items-center justify-between text-left">
                            <span className="text-sm">{item.taxes.length} tax(es) aplicados</span>
                            <span className="font-semibold">{formatCurrency(totalTaxes, currency)}</span>
                        </div>
                     </div>
                     <div className="md:col-span-1 text-right">
                        <p className="text-xs text-slate-500">Total con Impuestos</p>
                        <p className="font-bold text-lg">{formatCurrency(totalWithTaxes, currency)}</p>
                     </div>
                </div>
            </div>
            
            <LineItemAdvancedOptions
                isOpen={isAdvancedOpen}
                onToggle={() => setAdvancedOpen(!isAdvancedOpen)}
                item={item}
                index={index}
                onItemChange={onItemChange}
            />
            <button type="button" onClick={() => onRemove(index)} className="absolute top-2 right-2 h-6 w-6 text-slate-400 hover:text-red-500">
                <i className="fa-solid fa-times"></i>
            </button>
        </div>
    );
};

export default LineItem;