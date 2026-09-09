
import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { MilestoneCategory } from '@/types';

interface AddMilestoneCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string, color: string }) => void;
  categoryToEdit: MilestoneCategory | null;
}

const AddMilestoneCategoryModal: React.FC<AddMilestoneCategoryModalProps> = ({ isOpen, onClose, onSave, categoryToEdit }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#008FFB');

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setColor(categoryToEdit.color);
    } else {
      setName('');
      setColor('#008FFB');
    }
  }, [categoryToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave({ name, color });
    }
  };
  
  const title = categoryToEdit ? t('components.modals.addMilestoneCategory.editTitle') : t('components.modals.addMilestoneCategory.addTitle');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('components.modals.addMilestoneCategory.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label={t('components.modals.addMilestoneCategory.color')}
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="!p-1 h-10"
        />
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit">{t('common.save')}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddMilestoneCategoryModal;
