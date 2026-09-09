import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { NotFoundPage } from '@/features/notfound';
import { InvoicePreview } from '@/features/invoice';
import Button from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
import CancelInvoiceModal from '../components/CancelInvoiceModal';
import { Invoice } from '@/types';

const InvoiceView: React.FC = () => {
    const { invoiceId } = useParams<{ invoiceId: string }>();
    const { invoices } = useAppState();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [isCancelModalOpen, setCancelModalOpen] = useState(false);

    const invoice = invoices.find(inv => inv.id === invoiceId);

    if (!invoice) {
        return <NotFoundPage />;
    }

    const handleConfirmCancel = (motive: string, replacementUuid?: string) => {
        dispatch({ type: 'CANCEL_INVOICE', payload: { invoiceId: invoice.id, motive, replacementUuid }});
        setCancelModalOpen(false);
    };

    const handleClone = () => {
        const newInvoice: Partial<Invoice> = {
            ...invoice,
            id: `inv-draft-${Date.now()}`,
            status: 'Vigente',
            paymentStatus: 'Unpaid',
            uuid: undefined,
            date: new Date(),
            folio: String(Math.floor(1000 + Math.random() * 9000)),
        };
        delete newInvoice.cancellationDetails;
        dispatch({ type: 'ADD_INVOICE', payload: { invoice: newInvoice as Invoice } });
        navigate(`/invoices/${newInvoice.id}/edit`);
    };

    const handleSend = () => {
        alert(`Simulating sending email for invoice ${invoice.serie}-${invoice.folio} to ${invoice.receiver.name}.`);
    };


    return (
        <>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                    {t('pages.invoice.view.title')} #{invoice.serie}{invoice.folio}
                </h1>
                <div className="flex gap-2 flex-wrap">
                    <Button variant="secondary" onClick={() => window.print()}>
                        <i className="fa-solid fa-print mr-2"></i> {t('pages.invoice.view.downloadPdf')}
                    </Button>
                     <Button variant="outline" onClick={handleClone}>
                        <i className="fa-regular fa-copy mr-2"></i> {t('pages.invoice.actions.clone')}
                    </Button>
                    {invoice.status === 'Vigente' ? (
                        <>
                        <Link to={`/invoices/${invoiceId}/edit`}>
                            <Button>
                                <i className="fa-solid fa-pencil mr-2"></i> {t('pages.invoice.view.editInvoice')}
                            </Button>
                        </Link>
                        <Button variant="outline" onClick={handleSend}>
                            <i className="fa-regular fa-paper-plane mr-2"></i> {t('pages.invoice.actions.send')}
                        </Button>
                        <Button variant="danger" onClick={() => setCancelModalOpen(true)}>
                            <i className="fa-solid fa-ban mr-2"></i> {t('pages.invoice.view.cancelInvoice')}
                        </Button>
                        </>
                    ) : (
                        <Button variant="outline" onClick={handleSend}>
                            <i className="fa-regular fa-paper-plane mr-2"></i> {t('pages.invoice.actions.resend')}
                        </Button>
                    )}
                </div>
            </div>
            {invoice.status === 'Cancelado' && (
                <div className="p-4 bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 rounded-lg mb-4 text-sm">
                    <p className="font-bold">{t('pages.invoice.view.cancelledBanner.title')}</p>
                    <p>{t('pages.invoice.view.cancelledBanner.motive')}: {invoice.cancellationDetails?.motive}</p>
                    {invoice.cancellationDetails?.replacementUuid && <p>{t('pages.invoice.view.cancelledBanner.replacement')}: {invoice.cancellationDetails.replacementUuid}</p>}
                </div>
            )}
            <InvoicePreview invoice={invoice} />
            <CancelInvoiceModal 
                isOpen={isCancelModalOpen} 
                onClose={() => setCancelModalOpen(false)}
                onConfirm={handleConfirmCancel}
            />
        </>
    );
};

export default InvoiceView;