import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { InvoiceLineItem, CfdiTax } from '@/types';
import Tooltip from '@/components/ui/Tooltip';

// Local type for managing taxes in the modal state with a unique key
type LocalCfdiTax = CfdiTax & { localId: string };

interface TaxRowProps {
    tax: LocalCfdiTax;
    onUpdate: (updatedTax: LocalCfdiTax) => void;
    onRemove: () => void;
    inputRef?: React.Ref<HTMLInputElement>;
}

const TaxRow: React.FC<TaxRowProps> = ({ tax, onUpdate, onRemove, inputRef }) => {
    const { t } = useTranslation();

    const handleUpdate = (field: keyof CfdiTax, value: any) => {
        let newTax: LocalCfdiTax = { ...tax, [field]: value };
        
        if (field === 'taxType' && value === 'ISR' && !newTax.isLocal) {
            newTax.isRetention = true;
        } else if (field === 'taxType' && value !== 'ISR' && tax.taxType === 'ISR' && !newTax.isLocal) {
            newTax.isRetention = false;
        }

        if (['rate', 'base', 'taxType'].includes(field)) {
            const rate = field === 'rate' ? Number(value) : newTax.rate;
            const base = field === 'base' ? Number(value) : newTax.base;
            if (!isNaN(rate) && !isNaN(base)) {
                newTax.amount = base * rate;
            }
        }
        
        onUpdate(newTax);
    };

    const toggleRetention = () => {
        handleUpdate('isRetention', !tax.isRetention);
    };
    
    const toggleLocal = () => {
        const isNowLocal = !tax.isLocal;
        const newTax = {
            ...tax,
            isLocal: isNowLocal,
            taxType: isNowLocal ? '' : 'IVA',
            isRetention: isNowLocal ? false : (tax.taxType === 'ISR'),
        };
        onUpdate(newTax);
    };

    const displayAmount = tax.isRetention ? -tax.amount : tax.amount;

    return (
        <div className="grid grid-cols-12 gap-x-2 gap-y-4 md:gap-x-4 items-end border-b border-slate-100 dark:border-slate-700/50 pb-4 last:border-b-0 md:border-b-0 md:pb-0">
            {/* --- MOBILE ROW 1 --- */}
            <div className="col-span-1 md:col-span-1">
                <label className="block text-xs font-semibold text-slate-500 md:hidden">&nbsp;</label>
                <Tooltip content={t('common.delete')}>
                    <Button size="sm" variant="ghost" onClick={onRemove} className="!p-0 h-8 w-8 text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400">
                        <i className="fa-solid fa-trash-can text-sm"></i>
                    </Button>
                </Tooltip>
            </div>
            <div className="col-span-3 md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 md:hidden">Tipo</label>
                <button
                    type="button"
                    onClick={toggleRetention}
                    className={`w-full flex items-center justify-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                        tax.isRetention
                            ? 'text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60'
                            : 'text-green-600 bg-green-100 hover:bg-green-200 dark:bg-green-500/20 dark:hover:bg-green-500/30'
                    }`}
                >
                    <i className={`fa-solid ${tax.isRetention ? 'fa-arrow-down' : 'fa-arrow-up'}`}></i>
                    <span>{tax.isRetention ? t('pages.invoice.form.taxManager.retained') : t('pages.invoice.form.taxManager.transferred')}</span>
                </button>
            </div>
            <div className="col-span-3 md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 md:hidden">Ámbito</label>
                 <button 
                    type="button" 
                    onClick={toggleLocal} 
                    className={`w-full flex items-center justify-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                        tax.isLocal
                            ? 'text-teal-600 bg-teal-100 hover:bg-teal-200 dark:bg-teal-500/20 dark:hover:bg-teal-500/30'
                            : 'text-sky-600 bg-sky-100 hover:bg-sky-200 dark:bg-sky-500/20 dark:hover:bg-sky-500/30'
                    }`}
                >
                    <i className={`fa-solid ${tax.isLocal ? 'fa-map-marker-alt' : 'fa-globe-americas'}`}></i>
                    <span>{tax.isLocal ? t('pages.invoice.form.taxManager.local') : t('pages.invoice.form.taxManager.federal')}</span>
                </button>
            </div>
            <div className="col-span-5 md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 md:hidden">{t('pages.invoice.form.taxManager.tax')}</label>
                 {tax.isLocal ? (
                    <Input ref={inputRef} value={tax.taxType} onChange={e => handleUpdate('taxType', e.target.value)} className="!p-1 text-sm dark:text-white" placeholder={t('pages.invoice.form.taxManager.tax')} />
                ) : (
                    <select value={tax.taxType} onChange={e => handleUpdate('taxType', e.target.value)} className="w-full !p-1 text-sm border rounded-md dark:bg-slate-700 dark:border-slate-600 bg-white dark:text-white focus:ring-primary-500 focus:border-primary-500">
                        <option value="IVA">IVA</option>
                        <option value="IEPS">IEPS</option>
                        <option value="ISR">ISR</option>
                    </select>
                )}
            </div>
            
            {/* --- MOBILE ROW 2 & DESKTOP ROW --- */}
            <div className="col-span-4 md:col-span-1">
                <label className="block text-xs font-semibold text-slate-500 md:hidden text-right">{t('pages.invoice.form.taxManager.rate')}</label>
                <Input type="number" step="0.0001" value={tax.rate} onChange={e => handleUpdate('rate', e.target.value)} className="!p-1 text-sm text-right"/>
            </div>
            <div className="col-span-4 md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 md:hidden text-right">{t('pages.invoice.form.taxManager.base')}</label>
                <Input type="number" step="0.01" value={tax.base} onChange={e => handleUpdate('base', e.target.value)} className="!p-1 text-sm text-right"/>
            </div>
            <div className="col-span-4 md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 md:hidden text-right">{t('pages.invoice.form.taxManager.amount')}</label>
                <Input type="number" step="0.01" value={displayAmount.toFixed(4)} readOnly className={`!p-1 text-sm bg-slate-100 dark:bg-slate-800 font-semibold text-right ${tax.isRetention ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} />
            </div>
        </div>
    );
};


interface TaxManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (taxes: CfdiTax[]) => void;
    lineItem: InvoiceLineItem;
    lineItemIndex: number;
}

export const TaxManagerModal: React.FC<TaxManagerModalProps> = ({ isOpen, onClose, onSave, lineItem, lineItemIndex }) => {
    const { t } = useTranslation();
    const [localTaxes, setLocalTaxes] = useState<LocalCfdiTax[]>([]);
    const baseAmount = (lineItem.quantity * lineItem.unitPrice) - (lineItem.discount || 0);
    const taxInputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const nextId = useRef(0);

    useEffect(() => {
        if (isOpen) {
            nextId.current = 0;
            const taxesWithIds = (lineItem.taxes || []).map((tax) => ({
                ...tax,
                localId: `initial-${nextId.current++}`
            }));
            setLocalTaxes(taxesWithIds);
        }
    }, [isOpen, lineItem]);

    useEffect(() => {
        const lastTax = localTaxes[localTaxes.length - 1];
        if (lastTax?.isLocal && !lastTax.taxType) {
            taxInputRefs.current[localTaxes.length - 1]?.focus();
        }
    }, [localTaxes.length]);

    const updateTax = (updatedTax: LocalCfdiTax) => {
        setLocalTaxes(prevTaxes => 
            prevTaxes.map(tax => tax.localId === updatedTax.localId ? updatedTax : tax)
        );
    };
    
    const addTax = (isRetention: boolean) => {
        const newTax: LocalCfdiTax = {
            localId: `new-${nextId.current++}`,
            base: baseAmount,
            taxType: isRetention ? 'ISR' : 'IVA',
            rate: isRetention ? 0.10 : 0.16,
            amount: baseAmount * (isRetention ? 0.10 : 0.16),
            isRetention: isRetention,
            isLocal: false,
            included: true
        };
        setLocalTaxes(prevTaxes => [...prevTaxes, newTax]);
    };
    
    const removeTax = (taxId: string) => {
        setLocalTaxes(prevTaxes => prevTaxes.filter(tax => tax.localId !== taxId));
    };
    
    const { transferredFederal, retainedFederal, transferredLocal, retainedLocal } = useMemo(() => {
        const totals = {
            transferredFederal: 0,
            retainedFederal: 0,
            transferredLocal: 0,
            retainedLocal: 0,
        };
        localTaxes.forEach(t => {
            if (t.isLocal) {
                if (t.isRetention) {
                    totals.retainedLocal += t.amount;
                } else {
                    totals.transferredLocal += t.amount;
                }
            } else {
                if (t.isRetention) {
                    totals.retainedFederal += t.amount;
                } else {
                    totals.transferredFederal += t.amount;
                }
            }
        });
        return totals;
    }, [localTaxes]);

    const totalTaxes = transferredFederal + transferredLocal - retainedFederal - retainedLocal;

    const truncatedDesc = lineItem.description.length > 30 ? `${lineItem.description.substring(0, 30)}...` : lineItem.description;

    const titleNode = (
      <div className="font-normal text-base text-left">
        <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            {t('pages.invoice.form.taxes')}
        </h4>
        <span className="text-xl font-bold text-slate-800 dark:text-slate-100">
            #{lineItemIndex + 1}: {truncatedDesc}
        </span>
      </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={titleNode} size="6xl">
            <div className="space-y-4">
                <div className="hidden md:grid grid-cols-12 gap-x-4 items-center px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">
                    <div className="col-span-1"></div> {/* For delete button */}
                    <div className="col-span-2">Tipo</div>
                    <div className="col-span-2">Ámbito</div>
                    <div className="col-span-2">{t('pages.invoice.form.taxManager.tax')}</div>
                    <div className="col-span-1 text-right">{t('pages.invoice.form.taxManager.rate')}</div>
                    <div className="col-span-2 text-right">{t('pages.invoice.form.taxManager.base')}</div>
                    <div className="col-span-2 text-right">{t('pages.invoice.form.taxManager.amount')}</div>
                </div>
                
                <div className="space-y-4 md:space-y-2">
                    {localTaxes.map((tax, index) => (
                       <TaxRow 
                            key={tax.localId} 
                            tax={tax}
                            onUpdate={updateTax} 
                            onRemove={() => removeTax(tax.localId)} 
                            inputRef={el => { taxInputRefs.current[index] = el; }}
                        />
                    ))}
                </div>
                
                 <div className="grid grid-cols-12 gap-x-2 pt-2">
                    <div className="col-start-1 col-span-12 md:col-start-2 md:col-span-4">
                        <div className="flex items-center gap-2">
                            <Button variant="secondary" size="sm" onClick={() => addTax(false)} className="flex-1 whitespace-nowrap">
                                <i className="fa-solid fa-plus-circle text-green-500 mr-2"></i>
                                {t('pages.invoice.form.taxManager.newTransfer')}
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => addTax(true)} className="flex-1 whitespace-nowrap">
                                <i className="fa-solid fa-minus-circle text-red-500 mr-2"></i>
                                {t('pages.invoice.form.taxManager.newRetention')}
                            </Button>
                        </div>
                    </div>
                </div>
                
                 <div className="grid grid-cols-12 gap-2 mt-4">
                    <div className="col-start-1 lg:col-start-8 col-span-12 lg:col-span-5 space-y-2">
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1 text-sm">
                            {(transferredFederal > 0 || retainedFederal > 0 || transferredLocal > 0 || retainedLocal > 0) ? (
                                <>
                                    {transferredFederal > 0 && (
                                        <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">{t('pages.invoice.form.taxManager.totals.transferredTotal')}:</span><span className="font-medium text-green-600 dark:text-green-400">${transferredFederal.toFixed(2)}</span></div>
                                    )}
                                    {retainedFederal > 0 && (
                                        <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">{t('pages.invoice.form.taxManager.totals.retainedTotal')}:</span><span className="font-medium text-red-600 dark:text-red-400">-${retainedFederal.toFixed(2)}</span></div>
                                    )}
                                    {transferredLocal > 0 && (
                                        <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">{t('pages.invoice.form.taxManager.totals.transferredLocalTotal')}:</span><span className="font-medium text-green-600 dark:text-green-400">${transferredLocal.toFixed(2)}</span></div>
                                    )}
                                    {retainedLocal > 0 && (
                                        <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">{t('pages.invoice.form.taxManager.totals.retainedLocalTotal')}:</span><span className="font-medium text-red-600 dark:text-red-400">-${retainedLocal.toFixed(2)}</span></div>
                                    )}
                                     <div className="flex justify-between font-bold pt-2 border-t border-slate-300 dark:border-slate-600"><span className="text-slate-600 dark:text-slate-300">{t('pages.invoice.form.taxManager.totals.totalTaxes')}:</span><span className="dark:text-white">${totalTaxes.toFixed(2)}</span></div>
                                </>
                            ) : (
                                <div className="text-center text-slate-500 text-xs py-2">No taxes added.</div>
                            )}
                        </div>
                    </div>
                </div>

            </div>

            <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
                <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
                <Button onClick={() => onSave(localTaxes.map(({ localId, ...taxData }) => taxData))}>{t('common.save')}</Button>
            </div>
        </Modal>
    );
};