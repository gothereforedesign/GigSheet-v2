import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register service worker safely in production without disruptive auto-reloads
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        // Controlled update without auto-reloading during user actions
        console.log('App update available');
      },
      onOfflineReady() {
        console.log('App ready for offline use');
      },
    });
  } else {
    // In development mode, unregister any stale service workers to prevent forced reloads on focus
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
