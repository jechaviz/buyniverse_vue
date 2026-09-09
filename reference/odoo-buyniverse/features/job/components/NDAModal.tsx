
import React from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';

interface NDAModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAgree: () => void;
}

const NDAModal: React.FC<NDAModalProps> = ({ isOpen, onClose, onAgree }) => {
    const { t } = useTranslation();
    const ndaText = `
This Non-Disclosure Agreement (the "Agreement") is entered into as of today (the "Effective Date"), by and between the freelancer ("Receiving Party") and the client posting the job ("Disclosing Party").

1.  **Confidential Information.** "Confidential Information" means any non-public information disclosed by Disclosing Party to Receiving Party, including but not limited to project details, business plans, financial information, and intellectual property.

2.  **Obligations.** Receiving Party agrees to:
    (a) hold the Confidential Information in strict confidence;
    (b) not disclose the Confidential Information to any third party; and
    (c) use the Confidential Information only for the purpose of evaluating and performing the freelance project.

3.  **Term.** This Agreement will remain in effect for a period of two (2) years from the Effective Date.

By clicking "Agree & Continue", you acknowledge that you have read and understood this Agreement and agree to be bound by its terms.
    `;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('components.modals.nda.title')}
        >
            <div className="space-y-6">
                <div className="max-h-80 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300">
                    <p className="whitespace-pre-wrap">{ndaText}</p>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <Button variant="secondary" onClick={onClose}>{t('components.modals.nda.decline')}</Button>
                    <Button onClick={onAgree}>{t('components.modals.nda.agree')}</Button>
                </div>
            </div>
        </Modal>
    );
};

export default NDAModal;
