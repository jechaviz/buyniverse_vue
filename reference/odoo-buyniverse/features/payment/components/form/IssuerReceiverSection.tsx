import React, { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { PaymentReceipt, Issuer, User } from '@/types';
import CollapsibleCard from '@/components/ui/CollapsibleCard';

interface IssuerReceiverSectionProps {
    payment: Partial<PaymentReceipt>;
    updatePayment: (updates: Partial<PaymentReceipt>) => void;
    setUiDocs: (docs: any[]) => void;
    issuers: Issuer[];
    clients: User[];
}

const IssuerReceiverSection: React.FC<IssuerReceiverSectionProps> = ({ payment, updatePayment, setUiDocs, issuers, clients }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(true);

    return (
        <CollapsibleCard title={t('pages.payment.form.issuerReceiver')} isOpen={isOpen} onToggle={() => setIsOpen(!isOpen)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-4">
                    <h3 className="font-semibold">{t('pages.payment.form.issuer')}</h3>
                    <select value={payment.issuerId} onChange={e => updatePayment({ issuerId: e.target.value })} className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600">
                        {issuers.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                </div>
                <div className="space-y-4">
                    <h3 className="font-semibold">{t('pages.payment.form.receiver')}</h3>
                    <select value={payment.receiverId || ''} onChange={e => { updatePayment({ receiverId: e.target.value, relatedDocuments: [] }); setUiDocs([]); }} className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600">
                        <option value="">Select a client...</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.companyName || c.name}</option>)}
                    </select>
                </div>
            </div>
        </CollapsibleCard>
    );
};

export default IssuerReceiverSection;
