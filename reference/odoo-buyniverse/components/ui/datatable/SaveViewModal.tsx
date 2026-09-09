
import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import Modal from '../Modal';
import Button from '../Button';
import Input from '../Input';
import { TableView } from '@/types';

interface SaveViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: string;
  currentView: TableView | undefined;
  onSave: (view: TableView) => void;
  onDelete: (viewId: string) => void;
  getCurrentConfig: () => TableView['config'];
}

const SaveViewModal: React.FC<SaveViewModalProps> = ({ isOpen, onClose, currentView, onSave, onDelete, getCurrentConfig }) => {
  const { t } = useTranslation();
  const [viewName, setViewName] = useState('');

  useEffect(() => {
    if (isOpen && currentView) {
      setViewName(currentView.name);
    } else {
      setViewName('');
    }
  }, [isOpen, currentView]);

  const handleSaveAsNew = () => {
    if (!viewName.trim()) return;
    const newView: TableView = {
      id: `view-${Date.now()}`,
      name: viewName,
      config: getCurrentConfig(),
    };
    onSave(newView);
    onClose();
  };

  const handleUpdateCurrent = () => {
    if (!currentView || !viewName.trim()) return;
    const updatedView: TableView = {
      ...currentView,
      name: viewName,
      config: getCurrentConfig(),
    };
    onSave(updatedView);
    onClose();
  };
  
  const handleDeleteCurrent = () => {
      if(currentView && window.confirm(t('common.table.confirmDeleteView', { name: currentView.name }))) {
          onDelete(currentView.id);
          onClose();
      }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('common.table.manageViews')}>
      <div className="space-y-4">
        <Input
          label={t('common.table.viewName')}
          value={viewName}
          onChange={(e) => setViewName(e.target.value)}
        />
        <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700">
            <div>
                 {currentView && !currentView.isDefault && (
                    <Button variant="danger" onClick={handleDeleteCurrent}>{t('common.table.deleteView')}</Button>
                 )}
            </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleSaveAsNew}>{t('common.table.saveAsNew')}</Button>
            {currentView && <Button onClick={handleUpdateCurrent}>{t('common.table.updateCurrent')}</Button>}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SaveViewModal;
