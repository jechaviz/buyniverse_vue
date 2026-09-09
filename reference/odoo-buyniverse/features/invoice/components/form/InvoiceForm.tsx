import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { useTranslation } from '@/hooks/useTranslation';
import { Invoice, InvoiceLineItem, UserType } from '@/types';
import { useInvoiceCalculations } from '../../hooks/useInvoiceCalculations';
import { validateCfdi40 } from '../../lib/cfdi40Validator';
import { TaxManagerModal } from '../TaxManagerModal';
import Card from '@/components/ui/Card';
import {
    RelatedCfdiSection,
    GlobalInfoSection,
    IssuerReceiverSection,
    InvoiceDetailsSection,
    LineItemsSection,
    InvoiceOptionsSection,
    InvoiceTotals,
    InvoiceActions
} from './';

interface InvoiceFormProps {
    invoiceToEdit?: Invoice;
}

const emptyLineItem = (): InvoiceLineItem => ({
    id: `item-${Date.now()}-${Math.random()}`,
    productCode: '01010101', // Clave para "No existe en el catálogo"
    unitCode: 'E48', // Unidad de servicio
    quantity: 1,
    unit: 'Servicio',
    description: '',
    unitPrice: 0,
    discount: 0,
    amount: 0,
    objetoImp: '02', // Sí objeto de impuesto
    taxes: []
});


const InvoiceForm: React.FC<InvoiceFormProps> = ({ invoiceToEdit }) => {
    const { t } = useTranslation();
    const { issuers, users, products, currentUser, invoices } = useAppState();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const debounceTimeout = useRef<number | null>(null);

    const isEditing = !!invoiceToEdit;
    
    const [invoice, setInvoice] = useState<Partial<Invoice>>(() => {
        if (isEditing) return invoiceToEdit;
        const defaultIssuer = issuers.find(i => i.id === 'issuer-1') || issuers[0];
        const clientDefaultEmailSettings = currentUser.type === UserType.Client ? currentUser.defaultInvoiceEmailSettings : undefined;
        return {
            id: `inv-draft-${Date.now()}`,
            version: '4.0',
            serie: 'A',
            folio: String(Math.floor(1000 + Math.random() * 9000)),
            date: new Date(),
            status: 'Vigente',
            paymentStatus: 'Unpaid',
            tipoDeComprobante: 'I',
            exportacion: '01',
            issuerId: defaultIssuer?.id || '',
            branchId: defaultIssuer?.branches?.[0]?.id || '',
            currency: 'USD',
            exchangeRate: 1,
            paymentMethod: 'PUE',
            lineItems: [emptyLineItem()],
            emailSettings: clientDefaultEmailSettings,
        };
    });

    const [validationErrors, setValidationErrors] = useState<ReturnType<typeof validateCfdi40>['errors']>({});
    const [taxManager, setTaxManager] = useState<{ isOpen: boolean, lineItemIndex: number | null }>({ isOpen: false, lineItemIndex: null });
    const [aiLoading, setAiLoading] = useState<Record<number, boolean>>({});
    const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | ''>('');


    const clients = useMemo(() => users.filter(u => u.type === UserType.Client), [users]);
    const totals = useInvoiceCalculations(invoice.lineItems || []);

    const updateInvoice = (updates: Partial<Invoice>) => setInvoice(prev => ({ ...prev, ...updates }));
    
    const performSave = useCallback((updatedInvoice: Partial<Invoice>) => {
        const actionType: 'UPDATE_INVOICE' | 'ADD_INVOICE' = invoices.some(inv => inv.id === updatedInvoice.id) ? 'UPDATE_INVOICE' : 'ADD_INVOICE';
        dispatch({ type: actionType, payload: { invoice: updatedInvoice as Invoice } });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(prev => prev === 'saved' ? '' : prev), 2000);
    }, [dispatch, invoices]);

    const debouncedSave = useCallback((updatedInvoice: Partial<Invoice>) => {
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        if (!updatedInvoice.uuid) { // Only auto-save drafts
            setSaveStatus('saving');
            debounceTimeout.current = window.setTimeout(() => {
                performSave(updatedInvoice);
            }, 1500);
        }
    }, [performSave]);

    useEffect(() => {
        debouncedSave(invoice);
        return () => { if (debounceTimeout.current) clearTimeout(debounceTimeout.current); };
    }, [invoice, debouncedSave]);
    
    // Effect to update issuer details when issuerId/branchId changes
    useEffect(() => {
        if(invoice.issuerId) {
            const selectedIssuer = issuers.find(i => i.id === invoice.issuerId);
            if(selectedIssuer) {
                const branch = selectedIssuer.branches?.find(b => b.id === invoice.branchId);
                updateInvoice({ issuer: { name: selectedIssuer.name, rfc: selectedIssuer.rfc, taxRegime: selectedIssuer.taxRegime, postalCode: branch?.postalCode || '' }});
            }
        }
    }, [invoice.issuerId, invoice.branchId, issuers]);
    
    // Effect to update receiver details when receiverId/receiverBranchId changes
    useEffect(() => {
        if (invoice.receiver?.userId) {
            const selectedClient = users.find(u => u.id === invoice.receiver?.userId);
            if(selectedClient) {
                const branch = selectedClient.branches?.find(b => b.id === invoice.receiverBranchId);
                // FIX: The receiver object must be a complete object of type Invoice['receiver'].
                // The previous implementation was missing the required 'cfdiUse' property.
                const newReceiver: Invoice['receiver'] = {
                    userId: selectedClient.id,
                    name: selectedClient.companyName || selectedClient.name,
                    rfc: selectedClient.rfc || '',
                    taxRegime: selectedClient.taxRegime || '',
                    postalCode: branch?.postalCode || selectedClient.postalCode || '',
                    cfdiUse: invoice.cfdiUse || invoice.receiver?.cfdiUse || 'G03',
                };
                updateInvoice({ 
                    receiver: newReceiver,
                    emailSettings: selectedClient.defaultInvoiceEmailSettings || currentUser.defaultInvoiceEmailSettings
                });
            }
        }
    }, [invoice.receiver?.userId, invoice.receiverBranchId, users, currentUser, invoice.cfdiUse]);
    

    const handleSaveDraft = () => {
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        setValidationErrors({});
        setSaveStatus('saving');
        performSave(invoice);
    };
    
    const handleStamp = () => {
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

        const finalInvoiceForValidation = { ...invoice, ...totals };
        const { errors } = validateCfdi40(finalInvoiceForValidation, (key) => t(key));
        setValidationErrors(errors);

        if (Object.keys(errors).length > 0) {
            return;
        }

        const finalInvoice: Invoice = { ...invoice, ...totals } as Invoice;
        
        if ((currentUser.folioBalance || 0) <= 0) {
            alert("No tiene folios suficientes para timbrar.");
            return;
        }
        finalInvoice.uuid = `UUID-STAMPED-${Date.now()}`;
        dispatch({ type: 'UPDATE_ENTITY', payload: { entity: 'users', id: currentUser.id, data: { folioBalance: (currentUser.folioBalance || 1) - 1 } } });
        
        dispatch({ type: invoiceToEdit ? 'UPDATE_INVOICE' : 'ADD_INVOICE', payload: { invoice: finalInvoice } });
        navigate(`/invoices/${finalInvoice.id}`);
    };
    
    const friendlyFieldNames: Record<string, string> = {
        'issuer.name': `${t('pages.invoice.form.issuer')} - ${t('pages.invoice.form.name')}`,
        'issuer.rfc': `${t('pages.invoice.form.issuer')} - ${t('pages.invoice.form.rfc')}`,
        'issuer.taxRegime': `${t('pages.invoice.form.issuer')} - ${t('pages.invoice.form.taxRegime')}`,
        'issuer.postalCode': `${t('pages.invoice.form.issuer')} - ${t('pages.invoice.form.fiscalAddress')}`,
        'receiver.name': `${t('pages.invoice.form.receiver')} - ${t('pages.invoice.form.name')}`,
        'receiver.rfc': `${t('pages.invoice.form.receiver')} - ${t('pages.invoice.form.rfc')}`,
        'receiver.taxRegime': `${t('pages.invoice.form.receiver')} - ${t('pages.invoice.form.taxRegime')}`,
        'receiver.postalCode': `${t('pages.invoice.form.receiver')} - ${t('pages.invoice.form.fiscalAddress')}`,
        'cfdiUse': t('pages.invoice.form.cfdiUse'),
        'date': t('pages.invoice.form.date'),
        'lineItems': t('pages.invoice.form.lineItems'),
    };

    const getLineItemFieldName = (field: string) => {
        const match = field.match(/lineItems\[(\d+)\]\.(.+)/);
        if (match) {
            const index = parseInt(match[1], 10) + 1;
            const subField = match[2];
            const subFieldName = {
                'description': t('pages.invoice.form.description'),
                'quantity': t('pages.invoice.form.quantity'),
                'unitPrice': t('pages.invoice.form.unitPrice'),
            }[subField] || subField;
            return `${t('pages.invoice.form.lineItems')} #${index} - ${subFieldName}`;
        }
        return field;
    };
    
    return (
    <>
        <div className="space-y-6">
            {Object.keys(validationErrors).length > 0 && (
                <Card className="p-4 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-500/50">
                    <h3 className="font-bold text-red-800 dark:text-red-200">{t('pages.invoice.form.validationErrors')}</h3>
                    <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 mt-2 space-y-1">
                        {Object.entries(validationErrors).map(([field, messages]) => {
                            const friendlyName = friendlyFieldNames[field] || getLineItemFieldName(field);
                            return (
                                <li key={field}>
                                    <strong>{friendlyName}:</strong> {(messages as string[]).join(', ')}
                                </li>
                            )
                        })}
                    </ul>
                </Card>
            )}

            <RelatedCfdiSection invoice={invoice} updateInvoice={updateInvoice} />
            
            <GlobalInfoSection invoice={invoice} updateInvoice={updateInvoice} />

            <IssuerReceiverSection 
                invoice={invoice} 
                updateInvoice={updateInvoice} 
                issuers={issuers} 
                clients={clients} 
                users={users} 
            />

            <InvoiceDetailsSection invoice={invoice} updateInvoice={updateInvoice} />

            <LineItemsSection
                invoice={invoice}
                updateInvoice={updateInvoice}
                products={products}
                setTaxManager={setTaxManager}
                aiLoading={aiLoading}
                setAiLoading={setAiLoading}
                currency={invoice.currency || 'USD'}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <InvoiceOptionsSection invoice={invoice} updateInvoice={updateInvoice} />
                </div>
                <div>
                     <InvoiceTotals totals={totals} currency={invoice.currency || 'USD'} />
                </div>
            </div>

            <InvoiceActions
                onSaveDraft={handleSaveDraft}
                onStamp={handleStamp}
                isEditing={isEditing}
                isDraft={!invoice.uuid}
                currentUser={currentUser}
                saveStatus={saveStatus}
            />

        </div>
         {taxManager.isOpen && taxManager.lineItemIndex !== null && invoice.lineItems && (
            <TaxManagerModal
                isOpen={taxManager.isOpen}
                onClose={() => setTaxManager({isOpen: false, lineItemIndex: null})}
                onSave={(taxes) => {
                    const newLineItems = [...(invoice.lineItems || [])];
                    newLineItems[taxManager.lineItemIndex!].taxes = taxes;
                    updateInvoice({ lineItems: newLineItems });
                    setTaxManager({ isOpen: false, lineItemIndex: null });
                }}
                lineItem={invoice.lineItems[taxManager.lineItemIndex]}
                lineItemIndex={taxManager.lineItemIndex}
            />
        )}
    </>
    );
};

export default InvoiceForm;
