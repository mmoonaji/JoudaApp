import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import Clarity from '@microsoft/clarity';
import './index.css';
import App from './App';
import { CartProvider } from './contexts/CartContext';
import { FavoritesProvider } from './contexts/FavoritesContext';

// #1: Clarity only — replayIntegration removed (Clarity handles session recording)
Clarity.init('xcts3rtu3g');

Sentry.init({
  dsn: 'https://2881f18e4d347194c2edaa8b517ed839@o4507910064922624.ingest.de.sentry.io/4507910070755408',
  environment: (import.meta as any).env?.MODE || 'production',
  integrations: [
    Sentry.browserTracingIntegration(),
    // replayIntegration removed: Clarity handles session recording (~30KB gz saved)
  ],
  tracesSampleRate: (import.meta as any).env?.PROD ? 0.1 : 1.0,
});

// Capture PWA install prompt globally
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).deferredInstallPrompt = e;
});

// #2: Manual SW registration removed — VitePWA handles it via registerType: 'prompt'
// Also removed: cache deletion side-effect that ran on every page load

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <FavoritesProvider>
      <CartProvider>
        <App />
      </CartProvider>
    </FavoritesProvider>
  </React.StrictMode>
);
