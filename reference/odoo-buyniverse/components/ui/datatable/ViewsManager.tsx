
import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import Dropdown from '../Dropdown';
import { TableView } from '@/types';

interface ViewsManagerProps {
  views: TableView[];
  activeViewId: string | null;
  onSelectView: (id: string) => void;
  onSave: () => void;
  isDirty: boolean;
}

const ViewsManager: React.FC<ViewsManagerProps> = ({ views, activeViewId, onSelectView, onSave, isDirty }) => {
  const { t } = useTranslation();
  const activeView = views.find(v => v.id === activeViewId);
  const activeViewName = activeView ? activeView.name : t('common.table.all');

  return (
    <Dropdown
      trigger={
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-600">
          <span>{activeViewName}</span>
          {isDirty && <span className="w-2 h-2 rounded-full bg-amber-500" title={t('common.table.unsavedChanges')}></span>}
          <i className="fa-solid fa-chevron-down text-xs"></i>
        </button>
      }
    >
      <div className="w-56">
        <div className="py-1">
          {views.map(view => (
            <button
              key={view.id}
              onClick={() => onSelectView(view.id)}
              className="w-full text-left block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              {view.name}
              {view.isDefault && <span className="text-xs text-slate-400 ml-2">(Default)</span>}
            </button>
          ))}
        </div>
        <div className="border-t border-slate-200 dark:border-slate-700 py-1">
           <button onClick={onSave} className="w-full text-left block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">
            {t('common.table.manageViews')}
          </button>
        </div>
      </div>
    </Dropdown>
  );
};

export default ViewsManager;
