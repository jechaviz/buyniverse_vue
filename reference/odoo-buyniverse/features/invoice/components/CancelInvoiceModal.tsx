import React, { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { catalogs } from '../lib/catalogs';

interface CancelInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (motive: string, replacementUuid?: string) => void;
}

const CancelInvoiceModal: React.FC<CancelInvoiceModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const { t } = useTranslation();
    const [motive, setMotive] = useState('02');
    const [replacementUuid, setReplacementUuid] = useState('');

    const handleConfirm = () => {
        onConfirm(motive, motive === '01' ? replacementUuid : undefined);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('pages.invoice.view.cancel.title')}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('pages.invoice.view.cancel.motive')}</label>
                    <select value={motive} onChange={e => setMotive(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600">
                        {Object.entries(catalogs.MotivoCancelacion).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                </div>
                {motive === '01' && (
                    <Input 
                        label={t('pages.invoice.view.cancel.replacementUuid')} 
                        value={replacementUuid}
                        onChange={e => setReplacementUuid(e.target.value)}
                        placeholder="E.g., A0B1C2D3-..."
                    />
                )}
                 <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
                    <Button variant="danger" onClick={handleConfirm}>{t('pages.invoice.view.cancel.confirm')}</Button>
                </div>
            </div>
        </Modal>
    );
};

export default CancelInvoiceModal;