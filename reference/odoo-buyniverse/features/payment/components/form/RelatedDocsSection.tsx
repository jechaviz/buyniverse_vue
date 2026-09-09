import React, { useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { PaymentReceipt, Invoice, User, RelatedDocument, CfdiTax } from '@/types';
import Card from '@/components/ui/Card';
import RelatedDocItem, { UIRelatedDoc } from './RelatedDocItem';
import { formatCurrency } from '@/utils/formatters';

interface RelatedDocsSectionProps {
    uiDocs: UIRelatedDoc[];
    setUiDocs: React.Dispatch<React.SetStateAction<UIRelatedDoc[]>>;
    payment: Partial<PaymentReceipt>;
    updatePayment: (updates: Partial<PaymentReceipt>) => void;
    selectedClient: User | undefined;
    invoices: Invoice[];
    validationErrors: Record<string, string>;
}

const aggregateTaxes = (taxes: CfdiTax[]): CfdiTax[] => {
    const map = new Map<string, CfdiTax>();
    taxes.forEach(tax => {
        const key = `${tax.taxType}-${tax.rate}-${tax.isRetention}-${tax.isLocal}`;
        if (map.has(key)) {
            const existing = map.get(key)!;
            existing.base += tax.base;
            existing.amount += tax.amount;
        } else {
            map.set(key, { ...tax });
        }
    });
    return Array.from(map.values());
}

const RelatedDocsSection: React.FC<RelatedDocsSectionProps> = (props) => {
    const { uiDocs, setUiDocs, payment, updatePayment, selectedClient, invoices, validationErrors } = props;
    const { t } = useTranslation();

    const availableInvoices = useMemo(() => {
        if (!selectedClient) return [];
        const relatedDocIds = new Set(payment.relatedDocuments?.map(doc => doc.documentId));
        return invoices.filter(inv =>
            inv.receiver?.userId === selectedClient.id &&
            inv.paymentMethod === 'PPD' &&
            inv.paymentStatus !== 'Paid' &&
            !relatedDocIds.has(inv.uuid!)
        );
    }, [selectedClient, invoices, payment.relatedDocuments]);

    const handleAddRelatedDoc = (invoiceId: string) => {
        const invoice = invoices.find(inv => inv.uuid === invoiceId);
        if (!invoice) return;
        
        const allOriginalTaxes = invoice.lineItems.flatMap(li => li.taxes);

        const newDoc: RelatedDocument = {
            id: `doc-${Date.now()}`,
            documentId: invoice.uuid!,
            serie: invoice.serie,
            folio: invoice.folio,
            currency: invoice.currency as 'USD' | 'MXN' | 'EUR',
            equivalenciaDR: payment.currency === invoice.currency ? 1 : 0,
            paymentNumber: 1, 
            previousBalance: invoice.total,
            amountPaid: 0,
            newBalance: invoice.total,
            taxes: aggregateTaxes(allOriginalTaxes),
            impuestosP: [],
            objetoImpDR: '02'
        };

        const newUiDoc: UIRelatedDoc = { ...newDoc, amountToApply: 0 };
        updatePayment({ relatedDocuments: [...(payment.relatedDocuments || []), newDoc] });
        setUiDocs(prev => [...prev, newUiDoc]);
    };
    
    const handleRemoveRelatedDoc = (docId: string) => {
        updatePayment({ relatedDocuments: (payment.relatedDocuments || []).filter(doc => doc.id !== docId) });
        setUiDocs(prev => prev.filter(d => d.id !== docId));
    };

    const handleUpdateUiDoc = (docId: string, updates: Partial<UIRelatedDoc>) => {
        const newUiDocs = uiDocs.map(doc => {
            if (doc.id === docId) {
                const updatedUiDoc = { ...doc, ...updates };
                const amountToApply = updates.amountToApply !== undefined ? updates.amountToApply : doc.amountToApply;
                const equivalencia = updates.equivalenciaDR !== undefined ? updates.equivalenciaDR : doc.equivalenciaDR;
                updatedUiDoc.amountPaid = amountToApply * (equivalencia || 1);
                updatedUiDoc.newBalance = doc.previousBalance - updatedUiDoc.amountPaid;

                const { amountToApply: _, ...docForState } = updatedUiDoc;
                updatePayment({
                    relatedDocuments: (payment.relatedDocuments || []).map(d => d.id === docId ? docForState : d)
                });
                
                return updatedUiDoc;
            }
            return doc;
        });
        setUiDocs(newUiDocs);
    };

    return (
        <Card>
            <div className="p-4 border-b dark:border-slate-700">
                <h3 className="text-lg font-bold">{t('pages.payment.form.relatedDocs')}</h3>
            </div>
            <div className="p-4 space-y-4">
                {uiDocs.map((doc, index) => (
                    <RelatedDocItem
                        key={doc.id}
                        doc={doc}
                        index={index}
                        payment={payment}
                        validationErrors={validationErrors}
                        onUpdate={handleUpdateUiDoc}
                        onRemove={handleRemoveRelatedDoc}
                    />
                ))}
                <div className="pt-4 border-t">
                    {selectedClient ? ( availableInvoices.length > 0 ? (
                        <select onChange={e => e.target.value && handleAddRelatedDoc(e.target.value)} value="" className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600">
                            <option value="">{t('pages.payment.form.selectPpdInvoices')}</option>
                            {availableInvoices.map(inv => (<option key={inv.uuid} value={inv.uuid}>{inv.serie}-{inv.folio} | Balance: {formatCurrency(inv.total, inv.currency)}</option>))}
                        </select>
                    ) : (<p className="text-sm text-center text-slate-500">{t('pages.payment.form.noPpdInvoices')}</p>)
                    ) : (<p className="text-sm text-center text-slate-500">Select a client to see their pending invoices.</p>)}
                </div>
            </div>
        </Card>
    );
};

export default RelatedDocsSection;