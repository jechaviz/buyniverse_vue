import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from '@/App';
import { AppStateProvider } from '@/context/AppStateContext';
import { I18nProvider } from '@/context/I18nContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppContextMenuProvider } from '@/context/AppContextMenuContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HashRouter>
      <I18nProvider>
        <ThemeProvider>
          <AppStateProvider>
            <AppContextMenuProvider>
              <App />
            </AppContextMenuProvider>
          </AppStateProvider>
        </ThemeProvider>
      </I18nProvider>
    </HashRouter>
  </React.StrictMode>
);