import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { RelatedDocument, PaymentReceipt, CfdiTax } from '@/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { formatCurrency } from '@/utils/formatters';

export interface UIRelatedDoc extends RelatedDocument {
    amountToApply: number;
}

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


interface RelatedDocItemProps {
    doc: UIRelatedDoc;
    index: number;
    payment: Partial<PaymentReceipt>;
    validationErrors: Record<string, string>;
    onUpdate: (docId: string, updates: Partial<UIRelatedDoc>) => void;
    onRemove: (docId: string) => void;
}

const RelatedDocItem: React.FC<RelatedDocItemProps> = ({ doc, index, payment, validationErrors, onUpdate, onRemove }) => {
    const { t } = useTranslation();

    return (
        <Card className="p-4 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <p className="font-semibold">{t('pages.payment.form.relatedInvoice')}</p>
                    <p className="text-sm font-mono text-slate-500">{t('pages.payment.form.invoiceInfo', { folio: doc.folio, uuid: doc.documentId.substring(0,8) })}</p>
                </div>
                <Button size="sm" variant="danger" onClick={() => onRemove(doc.id)}>{t('common.delete')}</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label={t('pages.payment.form.paymentNumber')} type="number" value={doc.paymentNumber} onChange={e => onUpdate(doc.id, { paymentNumber: parseInt(e.target.value) || 1 })}/>
                {payment.currency !== doc.currency && <Input label={t('pages.payment.form.equivalenciaDR')} type="number" step="any" value={doc.equivalenciaDR} onChange={e => onUpdate(doc.id, { equivalenciaDR: parseFloat(e.target.value) || 0 })} error={validationErrors[`doc-${index}-eq`]} tooltip={t('pages.payment.form.equivalenciaDRTooltip')} />}
            </div>
            
            <div className="mt-4 p-4 bg-white dark:bg-slate-800/50 rounded-lg border dark:border-slate-700">
                <h4 className="text-sm font-semibold mb-2 text-center">{t('pages.payment.form.financials')}</h4>
                <div className="flex flex-col md:flex-row items-center justify-around gap-4 text-center">
                    <div className="flex-1">
                        <p className="text-xs text-slate-500">{t('pages.payment.form.prevBalance')}</p>
                        <p className="text-xl font-bold font-mono text-slate-700 dark:text-slate-300">{formatCurrency(doc.previousBalance, doc.currency)}</p>
                    </div>
                    <div className="text-2xl text-slate-400 font-light">-</div>
                    <div className="flex-1">
                        <Input label={t('pages.payment.form.amountToApply', { currency: payment.currency })} type="number" value={doc.amountToApply} onChange={e => onUpdate(doc.id, { amountToApply: parseFloat(e.target.value) || 0 })} error={validationErrors[`doc-${index}-amount`]} className="text-center font-bold !text-lg !py-1"/>
                        <p className="text-xs text-slate-500 mt-1">{t('pages.payment.form.amountPaidInDocCurrency', { amount: (doc.amountPaid).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), currency: doc.currency })}</p>
                    </div>
                    <div className="text-2xl text-slate-400 font-light">=</div>
                    <div className="flex-1">
                        <p className="text-xs text-slate-500">{t('pages.payment.form.impSaldoInsoluto')}</p>
                        <p className="text-xl font-bold font-mono text-green-600 dark:text-green-400">{formatCurrency(doc.newBalance, doc.currency)}</p>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t dark:border-slate-700">
                <TaxBreakdownTable taxes={doc.taxes} title={t('pages.payment.form.taxSections.original')} currency={doc.currency} />
                <TaxBreakdownTable taxes={doc.impuestosP} title={t('pages.payment.form.taxSections.payment')} currency={doc.currency}/>
            </div>
        </Card>
    );
};

export default RelatedDocItem;
