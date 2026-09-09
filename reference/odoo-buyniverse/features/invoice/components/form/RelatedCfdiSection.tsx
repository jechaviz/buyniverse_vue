import React, { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Invoice } from '@/types';
import CollapsibleCard from '@/components/ui/CollapsibleCard';
import TagInput from '@/components/ui/TagInput';
import { catalogs } from '../../lib/catalogs';

interface RelatedCfdiSectionProps {
    invoice: Partial<Invoice>;
    updateInvoice: (updates: Partial<Invoice>) => void;
}

const RelatedCfdiSection: React.FC<RelatedCfdiSectionProps> = ({ invoice, updateInvoice }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(!!invoice.cfdiRelacionados);

    return (
        <CollapsibleCard title={t('pages.invoice.form.relatedCfdi')} isOpen={isOpen} onToggle={() => setIsOpen(!isOpen)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">{t('pages.invoice.form.relationType')}</label>
                    <select
                        value={invoice.cfdiRelacionados?.tipoRelacion || ''}
                        onChange={e => updateInvoice({ cfdiRelacionados: { tipoRelacion: e.target.value, uuids: invoice.cfdiRelacionados?.uuids || [] } })}
                        className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                    >
                        <option value="">Select...</option>
                        {Object.entries(catalogs.TipoRelacion).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                </div>
                <div>
                    <TagInput
                        label="UUIDs"
                        tags={invoice.cfdiRelacionados?.uuids || []}
                        onTagsChange={tags => updateInvoice({ cfdiRelacionados: { uuids: tags, tipoRelacion: invoice.cfdiRelacionados?.tipoRelacion || '' } })}
                        placeholder={t('pages.invoice.form.addUuid')}
                    />
                </div>
            </div>
        </CollapsibleCard>
    );
};

export default RelatedCfdiSection;