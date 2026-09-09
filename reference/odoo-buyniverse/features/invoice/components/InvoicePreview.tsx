import React from 'react';
import { Invoice, InvoiceLineItem } from '@/types';
import { useUsers } from '@/hooks/useUsers';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppState } from '@/context/AppStateContext';
import { catalogs } from '../lib/catalogs';

interface InvoicePreviewProps {
    invoice: Invoice;
}

const InvoicePreview: React.FC<InvoicePreviewProps> = ({ invoice }) => {
    const { t } = useTranslation();
    const { issuers } = useAppState();

    const issuer = invoice.issuer;
    const receiver = invoice.receiver;
    
    const issuerDetails = issuers.find(i => i.id === invoice.issuerId);
    const issuerBranch = issuerDetails?.branches.find(b => b.id === invoice.branchId);


    const formatCurrency = (amount: number) => {
        return amount.toLocaleString('en-US', { style: 'currency', currency: invoice.currency });
    };

    const renderAdvancedInfo = (item: InvoiceLineItem) => {
        const hasAdvancedInfo = item.aCuentaTerceros || item.informacionAduanera || item.cuentaPredial || (item.partes && item.partes.length > 0);
        if (!hasAdvancedInfo) return null;

        return (
            <tr className="bg-slate-50 dark:bg-slate-700/20">
                <td colSpan={5} className="p-2 pl-8 text-xs">
                    {item.aCuentaTerceros && (
                        <div className="mb-2">
                            <strong>{t('pages.invoice.form.thirdPartyAccount')}:</strong> {item.aCuentaTerceros.nombre} ({item.aCuentaTerceros.rfc})
                        </div>
                    )}
                    {item.informacionAduanera && item.informacionAduanera.length > 0 && (
                        <div className="mb-2">
                            <strong>{t('pages.invoice.form.customsInfo')}:</strong>
                            {item.informacionAduanera.map((info, i) => <span key={i} className="ml-2 font-mono">{info.numeroPedimento}</span>)}
                        </div>
                    )}
                     {item.cuentaPredial && (
                        <div className="mb-2">
                            <strong>{t('pages.invoice.form.propertyTaxAccount')}:</strong> {item.cuentaPredial.numero}
                        </div>
                    )}
                    {item.partes && item.partes.length > 0 && (
                        <div>
                            <strong className="text-xs font-semibold uppercase">{t('pages.invoice.form.parts')}</strong>
                            <table className="w-full mt-1 text-left">
                                <thead>
                                    <tr className="bg-slate-200 dark:bg-slate-600">
                                        <th className="p-1 font-normal">{t('pages.invoice.form.description')}</th>
                                        <th className="p-1 font-normal text-right">{t('pages.invoice.form.quantity')}</th>
                                        <th className="p-1 font-normal text-right">{t('pages.invoice.form.unitPrice')}</th>
                                        <th className="p-1 font-normal text-right">{t('pages.invoice.form.amount')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {item.partes.map((part, i) => (
                                        <tr key={part.id || i}>
                                            <td className="p-1">{part.description}</td>
                                            <td className="p-1 text-right">{part.quantity}</td>
                                            <td className="p-1 text-right">{formatCurrency(part.unitPrice || 0)}</td>
                                            <td className="p-1 text-right">{formatCurrency(part.amount || 0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </td>
            </tr>
        )
    }

    return (
        <div className="bg-white dark:bg-slate-800 shadow-lg rounded-lg p-8" id="invoice-preview">
            <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                    <h2 className="font-bold text-lg mb-2">{issuer.name}</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">RFC: {issuer.rfc}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Régimen Fiscal: {issuer.taxRegime}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Lugar de Expedición: {issuerBranch?.name} (CP: {issuerBranch?.postalCode})</p>
                </div>
                <div className="text-right">
                    <h1 className="text-3xl font-bold uppercase text-slate-400 dark:text-slate-500">{t('pages.invoice.view.title')}</h1>
                    <p className="font-mono">{invoice.serie}{invoice.folio}</p>
                    {invoice.uuid && <p className="text-xs font-mono text-slate-500 mt-2">UUID: {invoice.uuid}</p>}
                </div>
            </div>

            {invoice.cfdiRelacionados && (invoice.cfdiRelacionados.uuids || []).length > 0 && (
                <div className="mb-8 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <p className="text-sm font-bold text-slate-500">{t('pages.invoice.form.relatedCfdi')}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400"><strong>{t('pages.invoice.form.relationType')}:</strong> {(catalogs.TipoRelacion as any)[invoice.cfdiRelacionados.tipoRelacion]}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-mono"><strong>UUIDs:</strong> {invoice.cfdiRelacionados.uuids.join(', ')}</p>
                </div>
            )}
             {invoice.informacionGlobal && (
                <div className="mb-8 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <p className="text-sm font-bold text-slate-500">{t('pages.invoice.form.globalInfo')}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400"><strong>{t('pages.invoice.form.periodicity')}:</strong> {(catalogs.Periodicidad as any)[invoice.informacionGlobal.periodicidad]}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400"><strong>{t('pages.invoice.form.months')}:</strong> {(catalogs.Meses as any)[invoice.informacionGlobal.meses]}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400"><strong>{t('pages.invoice.form.year')}:</strong> {invoice.informacionGlobal.año}</p>
                </div>
            )}

            <div className="grid grid-cols-2 gap-8 mb-8 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div>
                    <p className="text-sm font-bold text-slate-500">{t('pages.invoice.form.receiver')}</p>
                    <p className="font-semibold">{receiver.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">RFC: {receiver.rfc}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Uso CFDI: {receiver.cfdiUse}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Domicilio Fiscal: {receiver.postalCode}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-bold text-slate-500">{t('pages.invoice.form.date')}</p>
                    <p>{new Date(invoice.date).toLocaleDateString()}</p>
                    <p className="text-sm font-bold text-slate-500 mt-2">{t('pages.invoice.form.paymentMethod')}</p>
                    <p>{invoice.paymentMethod}</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-100 dark:bg-slate-700">
                            <th className="p-2 text-sm font-semibold">{t('pages.invoice.form.description')}</th>
                            <th className="p-2 text-sm font-semibold text-right">{t('pages.invoice.form.quantity')}</th>
                            <th className="p-2 text-sm font-semibold text-right">{t('pages.invoice.form.unitPrice')}</th>
                            <th className="p-2 text-sm font-semibold text-right">{t('pages.invoice.form.discount')}</th>
                            <th className="p-2 text-sm font-semibold text-right">{t('pages.invoice.form.amount')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {invoice.lineItems.map(item => (
                            <React.Fragment key={item.id}>
                                <tr>
                                    <td className="p-2">
                                        {item.noIdentificacion && <span className="font-mono text-xs text-slate-500 block">[{item.noIdentificacion}]</span>}
                                        {item.description}
                                    </td>
                                    <td className="p-2 text-right">{item.quantity}</td>
                                    <td className="p-2 text-right">{formatCurrency(item.unitPrice)}</td>
                                    <td className="p-2 text-right">{formatCurrency(item.discount)}</td>
                                    <td className="p-2 text-right">{formatCurrency(item.amount)}</td>
                                </tr>
                                {renderAdvancedInfo(item)}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col md:flex-row justify-between mt-8 gap-8">
                <div className="flex-grow">
                    {invoice.paymentNotes && (
                        <div>
                            <h4 className="font-semibold mb-1">{t('pages.invoice.form.paymentNotes')}</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{invoice.paymentNotes}</p>
                        </div>
                    )}
                    {(invoice.attachments || []).length > 0 && (
                        <div className="mt-4">
                            <h4 className="font-semibold mb-1">{t('pages.invoice.form.attachments')}</h4>
                            <ul className="text-sm list-disc list-inside">
                                {invoice.attachments?.map(file => (
                                    <li key={file.id}><a href={file.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">{file.name}</a></li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                <div className="w-full max-w-xs space-y-2 flex-shrink-0">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">{t('pages.invoice.totals.subtotal')}</span>
                        <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    {invoice.discount > 0 && (
                        <div className="flex justify-between text-sm text-red-600">
                            <span >{t('pages.invoice.totals.discount')}</span>
                            <span className="font-medium">-{formatCurrency(invoice.discount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">{t('pages.invoice.totals.taxTotal')}</span>
                        <span className="font-medium">{formatCurrency(invoice.taxTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">{t('pages.invoice.totals.retainedTotal')}</span>
                        <span className="font-medium">-{formatCurrency(invoice.retainedTotal)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-slate-200 dark:border-slate-600">
                        <span>{t('pages.invoice.totals.total')}</span>
                        <span>{formatCurrency(invoice.total)}</span>
                    </div>
                </div>
            </div>
            
            {invoice.uuid && (
                <div className="mt-8 pt-4 border-t border-dashed text-xs text-slate-500 font-mono break-all">
                    <p>Sello Digital del CFDI: {invoice.satSeal}</p>
                    <p className="mt-2">Sello del Emisor: {invoice.issuerSeal}</p>
                </div>
            )}
        </div>
    );
};

export default InvoicePreview;