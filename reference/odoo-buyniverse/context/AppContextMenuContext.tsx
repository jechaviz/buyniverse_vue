import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

interface MenuState {
  visible: boolean;
  x: number;
  y: number;
  contextData: any;
}

interface AppMenuContextType {
  menuState: MenuState;
  showMenu: (event: React.MouseEvent, contextData: any) => void;
  hideMenu: () => void;
}

const AppContextMenuContext = createContext<AppMenuContextType | undefined>(undefined);

export const AppContextMenuProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [menuState, setMenuState] = useState<MenuState>({
    visible: false,
    x: 0,
    y: 0,
    contextData: null,
  });

  const showMenu = useCallback((event: React.MouseEvent, contextData: any) => {
    event.preventDefault();
    setMenuState({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      contextData,
    });
  }, []);

  const hideMenu = useCallback(() => {
    setMenuState(prev => ({ ...prev, visible: false }));
  }, []);

  return (
    <AppContextMenuContext.Provider value={{ menuState, showMenu, hideMenu }}>
      {children}
    </AppContextMenuContext.Provider>
  );
};

export const useAppContextMenu = (): AppMenuContextType => {
  const context = useContext(AppContextMenuContext);
  if (!context) {
    throw new Error('useAppContextMenu must be used within an AppContextMenuProvider');
  }
  return context;
};
