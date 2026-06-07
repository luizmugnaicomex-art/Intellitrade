import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { TranslationProvider } from './translations';
import { AppProvider } from './context/AppContext';
import { HashRouter } from 'react-router-dom';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <TranslationProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </TranslationProvider>
    </HashRouter>
  </StrictMode>
);
