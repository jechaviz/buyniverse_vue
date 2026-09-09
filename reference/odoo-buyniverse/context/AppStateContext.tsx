import React, { createContext, useReducer, useContext, ReactNode, Dispatch } from 'react';
import { AppState, Action } from '@/types';
import { initialState } from '@/store/initialState';
import { appReducer } from '@/store/reducer';

const AppStateContext = createContext<{ state: AppState; dispatch: Dispatch<Action> } | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialState);
    return (
        <AppStateContext.Provider value={{ state, dispatch }}>
            {children}
        </AppStateContext.Provider>
    );
};

export const useAppState = (): AppState => {
    const context = useContext(AppStateContext);
    if (!context) {
        throw new Error('useAppState must be used within an AppStateProvider');
    }
    return context.state;
};

export const useAppDispatch = (): Dispatch<Action> => {
    const context = useContext(AppStateContext);
    if (!context) {
        throw new Error('useAppDispatch must be used within an AppStateProvider');
    }
    return context.dispatch;
};