import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface PaymentActionsProps {
    validationErrors: Record<string, string>;
    isEditing: boolean;
    onSave: (stamp: boolean) => void;
    onCancel: () => void;
}

const PaymentActions: React.FC<PaymentActionsProps> = ({ validationErrors, isEditing, onSave, onCancel }) => {
    const { t } = useTranslation();

    return (
        <Card className="p-4">
            {Object.values(validationErrors).map((error, i) => <p key={i} className="text-red-500 text-sm mb-2">{error}</p>)}
            <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={onCancel}>{t('common.cancel')}</Button>
                <Button onClick={() => onSave(true)}>{t(isEditing ? 'common.save' : 'pages.invoice.form.stamp')}</Button>
            </div>
        </Card>
    );
};

export default PaymentActions;
