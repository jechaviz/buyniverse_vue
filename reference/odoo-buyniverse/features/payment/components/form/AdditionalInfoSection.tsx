import React, { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { PaymentReceipt } from '@/types';
import CollapsibleCard from '@/components/ui/CollapsibleCard';
import Input from '@/components/ui/Input';

interface AdditionalInfoSectionProps {
    payment: Partial<PaymentReceipt>;
    updatePayment: (updates: Partial<PaymentReceipt>) => void;
}

const AdditionalInfoSection: React.FC<AdditionalInfoSectionProps> = ({ payment, updatePayment }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <CollapsibleCard title={t('pages.payment.form.additionalInfo')} isOpen={isOpen} onToggle={() => setIsOpen(!isOpen)}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                <Input label={t('pages.payment.form.numOperacion')} value={payment.numOperacion || ''} onChange={e => updatePayment({ numOperacion: e.target.value })} />
                <Input label={t('pages.payment.form.ctaOrdenante')} value={payment.ctaOrdenante || ''} onChange={e => updatePayment({ ctaOrdenante: e.target.value })} tooltip={t('pages.payment.form.ctaOrdenanteTooltip')} />
                <Input label={t('pages.payment.form.rfcEmisorCtaOrd')} value={payment.rfcEmisorCtaOrd || ''} onChange={e => updatePayment({ rfcEmisorCtaOrd: e.target.value })} tooltip={t('pages.payment.form.rfcEmisorCtaOrdTooltip')} />
                <Input label={t('pages.payment.form.nomBancoOrdExt')} value={payment.nomBancoOrdExt || ''} onChange={e => updatePayment({ nomBancoOrdExt: e.target.value })} tooltip={t('pages.payment.form.nomBancoOrdExtTooltip')} />
                <Input label={t('pages.payment.form.ctaBeneficiario')} value={payment.ctaBeneficiario || ''} onChange={e => updatePayment({ ctaBeneficiario: e.target.value })} tooltip={t('pages.payment.form.ctaBeneficiarioTooltip')} />
                <Input label={t('pages.payment.form.rfcEmisorCtaBen')} value={payment.rfcEmisorCtaBen || ''} onChange={e => updatePayment({ rfcEmisorCtaBen: e.target.value })} tooltip={t('pages.payment.form.rfcEmisorCtaBenTooltip')} />
            </div>
        </CollapsibleCard>
    );
};

export default AdditionalInfoSection;
