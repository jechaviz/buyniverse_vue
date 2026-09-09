import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { useTranslation } from '@/hooks/useTranslation';
import { PaymentReceipt, RelatedDocument, User, UserType, Invoice, CfdiTax } from '@/types';
import {
    IssuerReceiverSection,
    PaymentDetailsSection,
    AdditionalInfoSection,
    RelatedDocsSection,
    PaymentTaxesSection,
    PaymentTotalsSection,
    PaymentActions,
    UIRelatedDoc
} from './form';

interface PaymentFormProps {
    paymentToEdit?: PaymentReceipt;
}

const initialTotals = {
    totalRetencionesIVA: 0,
    totalRetencionesISR: 0,
    totalRetencionesIEPS: 0,
    totalTrasladosBaseIVA16: 0,
    totalTrasladosImpuestoIVA16: 0,
    totalTrasladosBaseIVA8: 0,
    totalTrasladosImpuestoIVA8: 0,
    totalTrasladosBaseIVA0: 0,
    totalTrasladosImpuestoIVA0: 0,
    totalTrasladosBaseIVAExento: 0,
    montoTotalPagos: 0,
};

// Helper to aggregate taxes
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


const PaymentForm: React.FC<PaymentFormProps> = ({ paymentToEdit }) => {
    const { t } = useTranslation();
    const { issuers, users, invoices } = useAppState();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const [payment, setPayment] = useState<Partial<PaymentReceipt>>(() => {
        if (paymentToEdit) return paymentToEdit;
        const defaultIssuer = issuers.find(i => i.id === 'issuer-1');
        return {
            id: `payrec-draft-${Date.now()}`,
            version: '2.0',
            serie: 'P',
            folio: String(Math.floor(1000 + Math.random() * 9000)),
            date: new Date(),
            status: 'Vigente',
            issuerId: defaultIssuer?.id || '',
            currency: 'USD',
            exchangeRate: 1,
            paymentType: '03',
            amount: 0,
            relatedDocuments: [],
            impuestosP: [],
            totals: initialTotals,
        };
    });

    const [uiDocs, setUiDocs] = useState<UIRelatedDoc[]>([]);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    
    // Sync UI state when payment object changes (e.g., on load)
    useEffect(() => {
        const docs = (paymentToEdit?.relatedDocuments || []).map(doc => ({
            ...doc,
            amountToApply: doc.amountPaid / (doc.equivalenciaDR || 1),
        }));
        setUiDocs(docs);
        if (paymentToEdit) setPayment(paymentToEdit);
    }, [paymentToEdit]);

    const updatePayment = (updates: Partial<PaymentReceipt>) => {
        setPayment(prev => ({ ...prev, ...updates }));
    };

    const selectedClient = useMemo(() => users.find(u => u.id === payment.receiverId), [payment.receiverId, users]);

    // Main calculation logic for totals and taxes
    useEffect(() => {
        const newTotals = { ...initialTotals };
        let montoTotalPagos = 0;

        const updatedDocs = (payment.relatedDocuments || []).map(doc => {
            const invoice = invoices.find(inv => inv.uuid === doc.documentId);
            if (!invoice) return { ...doc, impuestosP: [] };

            montoTotalPagos += doc.amountPaid / (doc.equivalenciaDR || 1);
            
            const paymentRatio = doc.previousBalance > 0 ? doc.amountPaid / doc.previousBalance : 0;
            const docImpuestosP: CfdiTax[] = [];
            const allOriginalTaxes = invoice.lineItems.flatMap(li => li.taxes);
            const aggregatedOriginalTaxes = aggregateTaxes(allOriginalTaxes);

            aggregatedOriginalTaxes.forEach(originalTax => {
                docImpuestosP.push({
                    ...originalTax,
                    base: originalTax.base * paymentRatio,
                    amount: originalTax.amount * paymentRatio,
                });
            });

            return { ...doc, impuestosP: docImpuestosP };
        });

        const allProportionalTaxes = updatedDocs.flatMap(doc => doc.impuestosP || []);
        
        allProportionalTaxes.forEach(taxP => {
            if (taxP.isRetention) {
                if (taxP.taxType === 'IVA') newTotals.totalRetencionesIVA += taxP.amount;
                if (taxP.taxType === 'ISR') newTotals.totalRetencionesISR += taxP.amount;
                if (taxP.taxType === 'IEPS') newTotals.totalRetencionesIEPS += taxP.amount;
            } else { // Traslados
                if (taxP.rate === 0.16) {
                    newTotals.totalTrasladosBaseIVA16 += taxP.base;
                    newTotals.totalTrasladosImpuestoIVA16 += taxP.amount;
                } else if (taxP.rate === 0.08) {
                    newTotals.totalTrasladosBaseIVA8 += taxP.base;
                    newTotals.totalTrasladosImpuestoIVA8 += taxP.amount;
                } else if (taxP.rate === 0) {
                    newTotals.totalTrasladosBaseIVA0 += taxP.base;
                    newTotals.totalTrasladosImpuestoIVA0 += taxP.amount;
                }
            }
        });
        newTotals.montoTotalPagos = montoTotalPagos;
        const rootImpuestosP = aggregateTaxes(allProportionalTaxes);
        
        if (JSON.stringify(updatedDocs) !== JSON.stringify(payment.relatedDocuments) || 
            JSON.stringify(newTotals) !== JSON.stringify(payment.totals) ||
            JSON.stringify(rootImpuestosP) !== JSON.stringify(payment.impuestosP)) {
            updatePayment({ relatedDocuments: updatedDocs, totals: newTotals, impuestosP: rootImpuestosP, amount: montoTotalPagos });
        }

    }, [JSON.stringify(payment.relatedDocuments), invoices]);


    const handleSave = (stamp: boolean) => {
        const errors: Record<string, string> = {};
        if (Math.abs(payment.amount! - uiDocs.reduce((sum, d) => sum + d.amountToApply, 0)) > 0.01) {
            errors.amount = t('pages.payment.form.validation.amountMismatch');
        }
        uiDocs.forEach((doc, i) => {
            if (doc.amountPaid > doc.previousBalance + 0.001) {
                errors[`doc-${i}-amount`] = t('pages.payment.form.validation.overpayment');
            }
            if (doc.currency !== payment.currency && doc.equivalenciaDR <= 0) {
                 errors[`doc-${i}-eq`] = t('pages.payment.form.validation.equivalenciaRequired');
            }
        });

        setValidationErrors(errors);
        if (Object.keys(errors).length > 0) return;

        const finalPayment: PaymentReceipt = { ...payment, totals: payment.totals || initialTotals } as PaymentReceipt;
        if(stamp) {
            finalPayment.uuid = `PAY-UUID-${Date.now()}`;
        }
        
        dispatch({ type: paymentToEdit ? 'UPDATE_PAYMENT_RECEIPT' : 'ADD_PAYMENT_RECEIPT', payload: { payment: finalPayment } });
        navigate(`/payments`);
    };

    return (
        <div className="space-y-6">
            <IssuerReceiverSection 
                payment={payment}
                updatePayment={updatePayment}
                setUiDocs={setUiDocs}
                issuers={issuers}
                clients={users.filter(u=>u.type === UserType.Client)}
            />

            <PaymentDetailsSection payment={payment} updatePayment={updatePayment} />

            <AdditionalInfoSection payment={payment} updatePayment={updatePayment} />

            <RelatedDocsSection 
                uiDocs={uiDocs}
                setUiDocs={setUiDocs}
                payment={payment}
                updatePayment={updatePayment}
                selectedClient={selectedClient}
                invoices={invoices}
                validationErrors={validationErrors}
            />

            <PaymentTaxesSection taxes={payment.impuestosP || []} currency={payment.currency || 'MXN'} />
            
            <PaymentTotalsSection totals={payment.totals || initialTotals} currency={payment.currency || 'MXN'} />

            <PaymentActions
                validationErrors={validationErrors}
                isEditing={!!paymentToEdit}
                onSave={handleSave}
                onCancel={() => navigate('/payments')}
            />
        </div>
    );
};

export default PaymentForm;