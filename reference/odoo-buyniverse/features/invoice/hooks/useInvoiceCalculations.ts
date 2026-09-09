import { useMemo } from 'react';
import { InvoiceLineItem, CfdiTax } from '@/types';

export const useInvoiceCalculations = (lineItems: InvoiceLineItem[]) => {
    const totals = useMemo(() => {
        let subtotal = 0;
        let discount = 0;
        const taxAggregator: Record<string, CfdiTax> = {};

        (lineItems || []).forEach(item => {
            const itemAmount = (item.quantity * item.unitPrice);
            subtotal += itemAmount;
            discount += item.discount || 0;

            const baseForTaxes = itemAmount - (item.discount || 0);
            (item.taxes || []).forEach(tax => {
                // For aggregation, only consider federal taxes as per CFDI spec for root Impuestos node
                if (!tax.isLocal) {
                    const key = `${tax.taxType}|${tax.rate}|${tax.isRetention}`;
                    if (taxAggregator[key]) {
                        taxAggregator[key].base += baseForTaxes;
                        taxAggregator[key].amount += baseForTaxes * tax.rate;
                    } else {
                        taxAggregator[key] = {
                            ...tax,
                            base: baseForTaxes,
                            amount: baseForTaxes * tax.rate,
                        };
                    }
                }
            });
        });

        const aggregatedTaxes = Object.values(taxAggregator);
        const traslados = aggregatedTaxes.filter(t => !t.isRetention);
        const retenciones = aggregatedTaxes.filter(t => t.isRetention);
        
        const totalImpuestosTrasladados = traslados.reduce((sum, tax) => sum + tax.amount, 0);
        const totalImpuestosRetenidos = retenciones.reduce((sum, tax) => sum + tax.amount, 0);

        // This is the grand total including all taxes (local and federal) for UI display
        let totalTaxForGrandTotal = 0;
        let totalRetainedForGrandTotal = 0;
        (lineItems || []).forEach(item => {
            (item.taxes || []).forEach(tax => {
                if (tax.isRetention) {
                    totalRetainedForGrandTotal += tax.amount;
                } else {
                    totalTaxForGrandTotal += tax.amount;
                }
            })
        });

        const total = subtotal - discount + totalTaxForGrandTotal - totalRetainedForGrandTotal;

        return {
            subtotal,
            discount,
            taxTotal: totalTaxForGrandTotal,
            retainedTotal: totalRetainedForGrandTotal,
            total,
            impuestos: {
                totalImpuestosTrasladados,
                totalImpuestosRetenidos,
                traslados,
                retenciones
            }
        };
    }, [lineItems]);

    return totals;
};