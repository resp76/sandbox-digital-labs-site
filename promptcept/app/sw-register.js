// Offline support for the web build. Kept out of index.html because the site CSP forbids inline scripts.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(error => console.warn('Offline support unavailable.', error));
  });
}
