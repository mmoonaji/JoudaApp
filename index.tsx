import React from 'react';
import ReactDOM from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import './index.css';
import App from './App';
import { CartProvider } from './contexts/CartContext';
import { FavoritesProvider } from './contexts/FavoritesContext';

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
    <Analytics />
  </React.StrictMode>
);
