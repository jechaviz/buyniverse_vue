import React, { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Invoice, Issuer, User } from '@/types';
import CollapsibleCard from '@/components/ui/CollapsibleCard';

interface IssuerReceiverSectionProps {
    invoice: Partial<Invoice>;
    updateInvoice: (updates: Partial<Invoice>) => void;
    issuers: Issuer[];
    clients: User[];
    users: User[];
}

const IssuerReceiverSection: React.FC<IssuerReceiverSectionProps> = ({ invoice, updateInvoice, issuers, clients, users }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(true);

    return (
        <CollapsibleCard title={t('pages.invoice.form.issuer') + ' & ' + t('pages.invoice.form.receiver')} isOpen={isOpen} onToggle={() => setIsOpen(!isOpen)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">{t('pages.invoice.form.issuer')}</h3>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('pages.invoice.form.issuerSelect')}</label>
                        <select value={invoice.issuerId} onChange={e => updateInvoice({ issuerId: e.target.value, branchId: issuers.find(i => i.id === e.target.value)?.branches[0].id })} className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600">
                            {issuers.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('pages.invoice.form.branchSelect')}</label>
                        <select value={invoice.branchId} onChange={e => updateInvoice({ branchId: e.target.value })} className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600" disabled={!invoice.issuerId}>
                            {issuers.find(i => i.id === invoice.issuerId)?.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">{t('pages.invoice.form.receiver')}</h3>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('pages.invoice.form.clientSelect')}</label>
                        <select value={invoice.receiver?.userId || ''} onChange={e => updateInvoice({ receiver: { ...(invoice.receiver || {}), userId: e.target.value } as any, receiverBranchId: undefined })} className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600">
                            <option value="">Select a client</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.companyName || c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('pages.invoice.form.clientBranchSelect')}</label>
                        <select value={invoice.receiverBranchId || ''} onChange={e => updateInvoice({ receiverBranchId: e.target.value })} className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600" disabled={!invoice.receiver?.userId || !(users.find(u => u.id === invoice.receiver?.userId)?.branches?.length)}>
                            <option value="">Main Address</option>
                            {users.find(u => u.id === invoice.receiver?.userId)?.branches?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>
        </CollapsibleCard>
    );
};

export default IssuerReceiverSection;