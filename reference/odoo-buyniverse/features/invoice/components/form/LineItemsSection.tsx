import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Invoice, InvoiceLineItem, Product, CfdiTax } from '@/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LineItem from './LineItem';

interface LineItemsSectionProps {
    invoice: Partial<Invoice>;
    updateInvoice: (updates: Partial<Invoice>) => void;
    products: Product[];
    setTaxManager: (state: { isOpen: boolean, lineItemIndex: number | null }) => void;
    aiLoading: Record<number, boolean>;
    setAiLoading: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
}

const emptyLineItem = (): InvoiceLineItem => ({
    id: `item-${Date.now()}-${Math.random()}`,
    productCode: '01010101',
    unitCode: 'E48',
    quantity: 1,
    unit: 'Servicio',
    description: '',
    unitPrice: 0,
    discount: 0,
    amount: 0,
    objetoImp: '02',
    taxes: []
});

const LineItemsSection: React.FC<LineItemsSectionProps> = (props) => {
    const { invoice, updateInvoice, products, setTaxManager, aiLoading, setAiLoading } = props;
    const { t } = useTranslation();

    const addLineItem = () => updateInvoice({ lineItems: [...(invoice.lineItems || []), emptyLineItem()] });

    const removeLineItem = (index: number) => {
        if ((invoice.lineItems || []).length <= 1) return; // Cannot remove the last item
        updateInvoice({ lineItems: (invoice.lineItems || []).filter((_, i) => i !== index) });
    };

    const handleLineItemChange = (index: number, updates: Partial<InvoiceLineItem>) => {
        const newLineItems = [...(invoice.lineItems || [])];
        let currentItem = { ...newLineItems[index], ...updates };
        
        if (updates.productId) {
            const product = products.find(p => p.id === updates.productId);
            if (product) {
                // Destructure to separate product-specific fields from line-item fields
                const { id, category, isPinned, rate, defaultTaxes, ...lineItemData } = product;

                currentItem = {
                    ...currentItem,
                    ...lineItemData, // Spreads productCode, unitCode, partes, etc.
                    description: product.description,
                    unitPrice: product.rate,
                    unit: product.unit,
                    // Map partial taxes from product to full tax objects for the line item
                    taxes: (product.defaultTaxes || []).map(t => ({
                        base: 0,
                        amount: 0,
                        isRetention: false, // Default, will be overwritten by spread if present
                        ...t
                    })) as CfdiTax[],
                };
            }
        }
        
        currentItem.amount = (currentItem.quantity * currentItem.unitPrice) - (currentItem.discount || 0);
        
        if(updates.unitPrice !== undefined || updates.quantity !== undefined || updates.discount !== undefined || updates.productId) {
             currentItem.taxes = (currentItem.taxes || []).map(tax => ({...tax, base: currentItem.amount, amount: currentItem.amount * (tax.rate || 0) }));
        }

        newLineItems[index] = currentItem;
        updateInvoice({ lineItems: newLineItems });
    };

    return (
        <Card>
            <div className="p-4 border-b dark:border-slate-700">
                <h3 className="text-lg font-bold">{t('pages.invoice.form.lineItems')}</h3>
            </div>
            <div className="p-4 space-y-4">
                {(invoice.lineItems || []).map((item, index) => (
                    <LineItem
                        key={item.id}
                        item={item}
                        index={index}
                        onItemChange={handleLineItemChange}
                        onRemove={removeLineItem}
                        products={products}
                        setTaxManager={setTaxManager}
                        aiLoading={aiLoading[index]}
                        setAiLoading={(loading) => setAiLoading(prev => ({...prev, [index]: loading}))}
                        currency={invoice.currency || 'USD'}
                    />
                ))}
            </div>
            <div className="p-4">
                <Button type="button" onClick={addLineItem} variant="secondary">
                    {t('pages.invoice.form.addLineItem')}
                </Button>
            </div>
        </Card>
    );
};

export default LineItemsSection;
