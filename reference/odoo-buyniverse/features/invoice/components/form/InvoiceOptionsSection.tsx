import React, { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Invoice } from '@/types';
import Card from '@/components/ui/Card';
import Textarea from '@/components/ui/Textarea';
import Input from '@/components/ui/Input';

interface InvoiceOptionsSectionProps {
    invoice: Partial<Invoice>;
    updateInvoice: (updates: Partial<Invoice>) => void;
}

const TabButton: React.FC<{tabId: string, activeTab: string, onClick: (tabId: string) => void, children: React.ReactNode}> = ({ tabId, activeTab, onClick, children}) => (
    <button type="button" onClick={() => onClick(tabId)} className={`px-4 py-2 text-sm font-semibold border-b-2 ${activeTab === tabId ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
        {children}
    </button>
);

const InvoiceOptionsSection: React.FC<InvoiceOptionsSectionProps> = ({ invoice, updateInvoice }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'notes' | 'email' | 'attachments'>('notes');

    return (
        <Card>
            <div className="border-b border-slate-200 dark:border-slate-700 flex items-center">
                <TabButton tabId="notes" activeTab={activeTab} onClick={() => setActiveTab('notes')}>{t('pages.invoice.form.notes')}</TabButton>
                <TabButton tabId="email" activeTab={activeTab} onClick={() => setActiveTab('email')}>{t('pages.invoice.form.emailSettings')}</TabButton>
                <TabButton tabId="attachments" activeTab={activeTab} onClick={() => setActiveTab('attachments')}>{t('pages.invoice.form.attachments')}</TabButton>
            </div>
            <div className="p-6 min-h-[220px]">
                {activeTab === 'notes' && <Textarea value={invoice.paymentNotes || ''} onChange={e => updateInvoice({ paymentNotes: e.target.value })} rows={5} placeholder={t('pages.invoice.form.paymentNotes')} />}
                {activeTab === 'email' && (
                    <div className="space-y-2">
                        <Input label="To" value={invoice.emailSettings?.to?.join(', ') || ''} onChange={e => updateInvoice({ emailSettings: { ...(invoice.emailSettings as any), to: e.target.value.split(',').map(em => em.trim())} })} />
                        <Input label="CC" value={invoice.emailSettings?.cc?.join(', ') || ''} onChange={e => updateInvoice({ emailSettings: { ...(invoice.emailSettings as any), cc: e.target.value.split(',').map(em => em.trim())} })} />
                        <Input label="Subject" value={invoice.emailSettings?.subject || ''} onChange={e => updateInvoice({ emailSettings: { ...(invoice.emailSettings as any), subject: e.target.value } })} />
                    </div>
                )}
                {activeTab === 'attachments' && <p className="text-center text-sm text-slate-500">Attachment upload coming soon.</p>}
            </div>
        </Card>
    );
};

export default InvoiceOptionsSection;
