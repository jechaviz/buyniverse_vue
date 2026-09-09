import React, { useEffect, useRef } from 'react';
import { useAppContextMenu } from '@/context/AppContextMenuContext';

const AppContextMenu: React.FC = () => {
  const { menuState, hideMenu } = useAppContextMenu();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        hideMenu();
      }
    };
    if (menuState.visible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('scroll', hideMenu, true);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', hideMenu, true);
    };
  }, [menuState.visible, hideMenu]);

  if (!menuState.visible) {
    return null;
  }

  const { x, y, contextData } = menuState;
  const { type, onConfigureCardLayout, onSort, onHide } = contextData || {};

  const menuStyle: React.CSSProperties = {
    top: y,
    left: x,
    position: 'fixed',
  };

  const renderMenuItems = () => {
    switch (type) {
      case 'row':
        return (
          <>
            <button
              onClick={() => { onConfigureCardLayout(); hideMenu(); }}
              className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <i className="fa-solid fa-wand-magic-sparkles mr-2"></i> Configure Card Layout (AI)
            </button>
             <div className="my-1 h-px bg-slate-200 dark:bg-slate-700" />
            <button onClick={hideMenu} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">View Details</button>
            <button onClick={hideMenu} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">Delete Row</button>
          </>
        );
      case 'cell':
         return (
          <>
            <button onClick={hideMenu} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">Copy Cell Value</button>
            <button onClick={hideMenu} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">Change Edit Type (AI)</button>
          </>
        );
      case 'header':
         return (
          <>
            <button onClick={() => { onSort(false); hideMenu(); }} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">Sort Ascending</button>
            <button onClick={() => { onSort(true); hideMenu(); }} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">Sort Descending</button>
            <button onClick={() => { onHide(); hideMenu(); }} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">Hide Column</button>
          </>
        );
      default:
        return <div className="p-2 text-sm text-slate-500">No actions available.</div>;
    }
  };

  return (
    <div ref={menuRef} style={menuStyle} className="z-[60] w-56 rounded-md shadow-lg bg-white dark:bg-slate-800 ring-1 ring-black ring-opacity-5 dark:ring-slate-700 focus:outline-none animate-fade-in">
      <div className="py-1">
        {renderMenuItems()}
      </div>
    </div>
  );
};

export default AppContextMenu;