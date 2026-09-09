import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { User } from '@/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface InvoiceActionsProps {
    onSaveDraft: () => void;
    onStamp: () => void;
    isEditing: boolean;
    isDraft: boolean;
    currentUser: User;
    saveStatus: 'saving' | 'saved' | '';
}

const InvoiceActions: React.FC<InvoiceActionsProps> = ({ onSaveDraft, onStamp, isEditing, isDraft, currentUser, saveStatus }) => {
    const { t } = useTranslation();

    const statusMap = {
        saving: t('common.saving'),
        saved: t('common.saved'),
        '': ''
    };

    return (
        <Card className="p-4">
            <div className="flex justify-between items-center">
                <div className="text-sm text-slate-500 italic h-6">
                    {saveStatus && 
                        <span className="transition-opacity duration-300 animate-fade-in">
                            {statusMap[saveStatus]}
                        </span>
                    }
                </div>
                <div className="flex gap-2">
                    {isDraft && <Button variant="secondary" onClick={onSaveDraft}>{t('pages.invoice.form.saveDraft')}</Button>}
                    <Button onClick={onStamp} disabled={(currentUser.folioBalance || 0) <= 0}>
                        {t(isEditing ? 'pages.invoice.form.update' : 'pages.invoice.form.stamp')}
                        <span className="ml-2 text-xs opacity-80">({currentUser.folioBalance || 0} folios)</span>
                    </Button>
                </div>
            </div>
        </Card>
    );
};

export default InvoiceActions;