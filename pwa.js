/* PWA plumbing: register the service worker and drive the Install button. */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .catch((err) => console.warn('Service worker registration failed', err));
    });
}

// True when already running as an installed app (standalone window).
function isInstalledApp() {
    return window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches ||
        window.navigator.standalone === true;
}

let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    // Don't offer "Install" inside the already-installed app.
    if (isInstalledApp()) return;
    const btn = document.getElementById('installBtn');
    if (btn) btn.hidden = false;
});

window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    const btn = document.getElementById('installBtn');
    if (btn) btn.hidden = true;
});

window.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('installBtn');
    if (!btn) return;
    if (isInstalledApp()) { btn.remove(); return; }
    btn.addEventListener('click', async () => {
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        btn.hidden = true;
    });
});
