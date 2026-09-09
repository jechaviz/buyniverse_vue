import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { useTranslation } from '@/hooks/useTranslation';
import { Invoice, InvoiceLineItem, UserType } from '@/types';
import { useInvoiceCalculations } from '../hooks/useInvoiceCalculations';
import { validateCfdi40 } from '../lib/cfdi40Validator';
import { TaxManagerModal } from './TaxManagerModal';
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
} from './form';

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
    // FIX: Destructure 'invoices' here to make it available for the debouncedSave callback.
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

    const clients = useMemo(() => users.filter(u => u.type === UserType.Client), [users]);
    const totals = useInvoiceCalculations(invoice.lineItems || []);

    const updateInvoice = (updates: Partial<Invoice>) => setInvoice(prev => ({ ...prev, ...updates }));

    // Auto-save draft logic (simplified)
    const debouncedSave = useCallback((updatedInvoice: Partial<Invoice>) => {
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        if (!updatedInvoice.uuid) { // Only save if it's a draft
            debounceTimeout.current = window.setTimeout(() => {
                // FIX: Use `invoices` from the component's scope instead of an undefined `state` variable.
                // FIX: Explicitly type actionType to prevent TypeScript from inferring it as a generic string.
                const actionType: 'UPDATE_INVOICE' | 'ADD_INVOICE' = invoices.some(inv => inv.id === updatedInvoice.id) ? 'UPDATE_INVOICE' : 'ADD_INVOICE';
                dispatch({ type: actionType, payload: { invoice: updatedInvoice as Invoice } });
            }, 1500);
        }
    }, [dispatch, isEditing, invoices]); // FIX: Add `invoices` to dependency array.

    useEffect(() => {
        debouncedSave(invoice);
        return () => { if (debounceTimeout.current) clearTimeout(debounceTimeout.current); };
    }, [invoice, debouncedSave]);
    
    // FIX: Correctly access `invoices` from application state within the `debouncedSave` callback and fix incorrect state destructuring. The `state` variable was used before it was declared and was incorrectly destructured from `useAppState`.
    // The redundant `state` variable has been removed.

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
    

    const handleSave = (stamp: boolean) => {
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

        const finalInvoiceForValidation = { ...invoice, ...totals };
        const { errors } = validateCfdi40(finalInvoiceForValidation, (key) => t(key));
        setValidationErrors(errors);

        if (Object.keys(errors).length > 0) {
            alert(t('pages.invoice.form.validationErrors'));
            return;
        }

        const finalInvoice: Invoice = { ...invoice, ...totals } as Invoice;
        
        if(stamp) {
            if ((currentUser.folioBalance || 0) <= 0) {
                alert("No tiene folios suficientes para timbrar.");
                return;
            }
            finalInvoice.uuid = `UUID-STAMPED-${Date.now()}`;
            // This logic should be on the reducer. A temporary direct dispatch for simplicity of the change.
            dispatch({ type: 'UPDATE_ENTITY', payload: { entity: 'users', id: currentUser.id, data: { folioBalance: (currentUser.folioBalance || 1) - 1 } } });
        }
        
        dispatch({ type: isEditing ? 'UPDATE_INVOICE' : 'ADD_INVOICE', payload: { invoice: finalInvoice } });
        navigate(`/invoices/${finalInvoice.id}`);
    };
    
    return (
    <>
        <div className="space-y-6">
            {Object.keys(validationErrors).length > 0 && (
                <Card className="p-4 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-500/50">
                    <h3 className="font-bold text-red-800 dark:text-red-200">{t('pages.invoice.form.validationErrors')}</h3>
                    <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 mt-2">
                        {Object.entries(validationErrors).map(([field, messages]) => 
                            <li key={field}>{field}: {(messages as unknown as string[]).join(', ')}</li>
                        )}
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
                handleSave={handleSave}
                isEditing={isEditing}
                currentUser={currentUser}
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
