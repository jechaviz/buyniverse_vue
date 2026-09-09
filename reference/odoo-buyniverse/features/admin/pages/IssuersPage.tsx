import React, { useState, useCallback, useMemo } from 'react';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { Issuer, Branch } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';

const IssuerForm: React.FC<{
    issuer: Partial<Issuer>;
    onUpdate: (issuer: Partial<Issuer>) => void;
}> = ({ issuer, onUpdate }) => {
    const { t } = useTranslation();

    const handleBranchUpdate = (branchId: string, updates: Partial<Branch>) => {
        const updatedBranches = (issuer.branches || []).map(b => 
            b.id === branchId ? { ...b, ...updates } : b
        );
        onUpdate({ branches: updatedBranches });
    };

    const handleAddBranch = () => {
        const newBranch: Branch = { id: `branch-${Date.now()}`, name: 'New Branch', postalCode: '' };
        onUpdate({ branches: [...(issuer.branches || []), newBranch] });
    };

    const handleRemoveBranch = (branchId: string) => {
        onUpdate({ branches: (issuer.branches || []).filter(b => b.id !== branchId) });
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold">{t('pages.admin.issuers.form.details')}</h3>
            <Input label={t('pages.admin.issuers.form.name')} value={issuer.name || ''} onChange={e => onUpdate({ name: e.target.value })} />
            <Input label={t('pages.admin.issuers.form.rfc')} value={issuer.rfc || ''} onChange={e => onUpdate({ rfc: e.target.value })} />
            <Input label={t('pages.admin.issuers.form.taxRegime')} value={issuer.taxRegime || ''} onChange={e => onUpdate({ taxRegime: e.target.value })} />

            <h3 className="text-lg font-bold pt-4 border-t">{t('pages.admin.issuers.form.branches')}</h3>
            <div className="space-y-2">
                {(issuer.branches || []).map(branch => (
                    <div key={branch.id} className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                        <Input placeholder="Name" value={branch.name} onChange={e => handleBranchUpdate(branch.id, { name: e.target.value })} wrapperClassName="flex-grow"/>
                        <Input placeholder="Postal Code" value={branch.postalCode} onChange={e => handleBranchUpdate(branch.id, { postalCode: e.target.value })} wrapperClassName="flex-grow"/>
                        <Button size="sm" variant="danger" onClick={() => handleRemoveBranch(branch.id)}><i className="fa-solid fa-trash"></i></Button>
                    </div>
                ))}
            </div>
            <Button variant="secondary" onClick={handleAddBranch}>{t('pages.admin.issuers.form.addBranch')}</Button>

            <h3 className="text-lg font-bold pt-4 border-t">{t('pages.admin.issuers.form.csdTitle')}</h3>
            <div className="p-4 border border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
                <strong>{t('pages.admin.issuers.form.securityWarning')}:</strong> {t('pages.admin.issuers.form.securityMessage')}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">{t('pages.admin.issuers.form.certFile')}</label><Input type="file" accept=".cer"/></div>
                <div><label className="text-sm font-medium">{t('pages.admin.issuers.form.keyFile')}</label><Input type="file" accept=".key"/></div>
                <div className="md:col-span-2"><Input type="password" label={t('pages.admin.issuers.form.password')} value={issuer.csdPassword || ''} onChange={e => onUpdate({csdPassword: e.target.value})} /></div>
            </div>

            <h3 className="text-lg font-bold pt-4 border-t">{t('pages.admin.issuers.form.pacTitle')}</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <Input label={t('pages.admin.issuers.form.pacProvider')} value={issuer.pacProvider || ''} onChange={e => onUpdate({pacProvider: e.target.value})} />
                 <Input label={t('pages.admin.issuers.form.pacUser')} value={issuer.pacUser || ''} onChange={e => onUpdate({pacUser: e.target.value})} />
                 <div className="md:col-span-2"><Input type="password" label={t('pages.admin.issuers.form.pacApiKey')} value={issuer.pacApiKey || ''} onChange={e => onUpdate({pacApiKey: e.target.value})} /></div>
             </div>
        </div>
    );
};


const IssuersPage: React.FC = () => {
    const { issuers } = useAppState();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingIssuer, setEditingIssuer] = useState<Partial<Issuer> | null>(null);
    
    const handleOpenModal = (issuer?: Issuer) => {
        setEditingIssuer(issuer ? { ...issuer } : { id: `issuer-${Date.now()}`, name: '', rfc: '', taxRegime: '', branches: [] });
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (editingIssuer) {
            dispatch({ type: 'UPDATE_ISSUER', payload: { issuer: editingIssuer as Issuer } });
        }
        setIsModalOpen(false);
        setEditingIssuer(null);
    };

    const columns = useMemo<ColumnDef<Issuer>[]>(() => [
        { accessorKey: 'name', header: () => t('pages.admin.issuers.headers.name'), cell: ({ row }) => <span className="font-semibold">{row.name}</span> },
        { accessorKey: 'rfc', header: () => t('pages.admin.issuers.headers.rfc'), cell: ({ row }) => row.rfc },
        { accessorKey: 'taxRegime', header: () => t('pages.admin.issuers.headers.taxRegime'), cell: ({ row }) => row.taxRegime },
        { accessorKey: 'branches', header: () => t('pages.admin.issuers.headers.branches'), cell: ({ row }) => row.branches.length },
        { 
            accessorKey: 'action', 
            header: () => '', 
            cell: ({ row }) => <Button size="sm" variant="outline" onClick={() => handleOpenModal(row)}>{t('common.edit')}</Button> 
        },
    ], [t]);

    return (
        <>
            <DataTable
                columns={columns}
                data={issuers}
                idKey="id"
                globalFilter={searchTerm}
                onGlobalFilterChange={setSearchTerm}
                pageTitle={t('pages.admin.issuers.title')}
            >
                <Button onClick={() => handleOpenModal()}>{t('pages.admin.issuers.add')}</Button>
            </DataTable>

            {editingIssuer && (
                <Modal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)}
                    title={editingIssuer.rfc ? t('pages.admin.issuers.form.editTitle') : t('pages.admin.issuers.form.createTitle')}
                >
                    <IssuerForm issuer={editingIssuer} onUpdate={setEditingIssuer} />
                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={handleSave}>{t('common.save')}</Button>
                    </div>
                </Modal>
            )}
        </>
    );
};

export default IssuersPage;