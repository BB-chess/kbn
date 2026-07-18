/* KBN vs K — offline service worker. Precaches the whole app (incl. tablebase). */
const CACHE = 'kbnvk-v10';

const ASSETS = [
    './',
    'index.html',
    'styles.css',
    'manifest.webmanifest',
    'app.js',
    'pwa.js',
    'computerMove.js',
    'captureMoves.js',
    'legalMoves.js',
    'recordMove.js',
    'gamePhase.js',
    'displayboard.js',
    'setOffBoard.js',
    'makeMove.js',
    'undoMove.js',
    'convertMove.js',
    'inCheck.js',
    'testForCheck.js',
    'makeFEN.js',
    'playUi.js',
    'randomPosition.js',
    'fullTablebase.js',
    'precompute.js',
    'valueSquareNames.js',
    'playBeep.js',
    'pieces/wK.svg', 'pieces/wB.svg', 'pieces/wN.svg',
    'pieces/bK.svg', 'pieces/bB.svg', 'pieces/bN.svg',
    'tb/kbnk-dtm.bin.gz',
    'icons/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE);
        // Cache each asset individually so one failure can't abort the whole
        // precache, and normalise redirects (serve's clean URLs 301 to '/').
        await Promise.all(ASSETS.map(async (url) => {
            try {
                const res = await fetch(url, { cache: 'no-store', redirect: 'follow' });
                if (res && res.ok) {
                    const body = await res.blob();
                    await cache.put(url, new Response(body, {
                        status: 200,
                        statusText: 'OK',
                        headers: res.headers
                    }));
                }
            } catch (e) {
                /* skip individual failures; page still works online */
            }
        }));
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// Return a plain, non-redirected 200 response so it is valid for a navigation.
async function cleanShell(res) {
    if (!res) return res;
    if (!res.redirected && res.status === 200) return res;
    const body = await res.blob();
    return new Response(body, {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
}

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    // Navigations: serve the cached shell first so the app launches with no
    // server / no network. A service worker may NOT return a redirected
    // response to a navigation, and some static servers (e.g. `serve` with
    // clean URLs) 301 `/index.html` -> `/`, so rebuild a clean 200 response.
    if (req.mode === 'navigate') {
        event.respondWith((async () => {
            const shell = (await caches.match('index.html')) || (await caches.match('./'));
            if (shell) return cleanShell(shell);
            try {
                return await fetch(req);
            } catch (e) {
                throw e;
            }
        })());
        return;
    }

    // Everything else: cache-first, then network (and cache the result).
    event.respondWith(
        caches.match(req).then((cached) => {
            if (cached) return cached;
            return fetch(req).then((res) => {
                if (res && res.ok) {
                    const copy = res.clone();
                    caches.open(CACHE).then((cache) => cache.put(req, copy));
                }
                return res;
            });
        })
    );
});
