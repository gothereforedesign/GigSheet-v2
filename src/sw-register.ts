export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // Register the service worker after load
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('Service worker registered with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('Service worker registration error:', err);
      });
  });
}
