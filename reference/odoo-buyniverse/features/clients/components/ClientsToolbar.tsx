
import React from 'react';
import Tooltip from '@/components/ui/Tooltip';
import Button from '@/components/ui/Button';

interface ClientsToolbarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedCount: number;
}

const IconButton: React.FC<{ icon: string; tooltip: string, disabled?: boolean, onClick?: () => void }> = ({ icon, tooltip, disabled, onClick }) => (
  <Tooltip content={tooltip}>
    <button onClick={onClick} disabled={disabled} className="h-10 w-10 flex items-center justify-center rounded-lg text-slate-500 hover:text-primary-600 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:text-primary-400 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">
      <i className={`fa-solid ${icon}`}></i>
    </button>
  </Tooltip>
);


const ClientsToolbar: React.FC<ClientsToolbarProps> = ({ searchTerm, onSearchChange, selectedCount }) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2">
      <div className="relative w-full sm:max-w-xs">
        <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
        <input
          type="text"
          placeholder="Search"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="bg-white dark:bg-slate-700/50 border-slate-300 dark:border-slate-600 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent rounded-lg w-full pl-10 pr-4 py-2 text-sm"
        />
      </div>

      <div className="flex items-center gap-1">
        <IconButton icon="fa-download" tooltip="Download" onClick={() => alert('Download functionality coming soon!')} />
        <IconButton icon="fa-upload" tooltip="Upload" onClick={() => alert('Upload functionality coming soon!')} />
        <IconButton icon="fa-filter" tooltip="Filter" onClick={() => alert('Filter functionality coming soon!')} />
        <button className="ml-2 w-10 h-10 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-md transition-transform transform hover:scale-110">
            <i className="fa-solid fa-plus text-lg"></i>
        </button>
      </div>
    </div>
  );
};

export default ClientsToolbar;
