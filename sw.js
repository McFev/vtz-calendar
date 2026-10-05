const APP_VERSION = '1.1.15';
const staticCacheName = `static-cache-v${APP_VERSION.split('.').join('_')}`;
const dynamicCacheName = `dynamic-cache-v${APP_VERSION.split('.').join('_')}`;

const staticAssets = [
    './',
    './index.html',
    './site.webmanifest',
    './favicon.ico',
    './favicon.svg',
    './favicon-96x96.png',
    './images/icons/apple-touch-icon.png',
    './images/icons/web-app-manifest-192x192.png',
    './images/icons/web-app-manifest-512x512.png',
    './images/icons/web-app-manifest-monochrome-192x192.png',
    './images/icons/web-app-manifest-monochrome-512x512.png',
    './js/app.js',
    './images/no-image.jpg',
    './images/today.svg',
    './images/day.svg',
    './images/night.svg',
    './images/about.svg'
];

self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(staticCacheName);
        await cache.addAll(staticAssets);
        // новый service worker активируется сразу, не дожидаясь закрытия вкладок
        await self.skipWaiting();
        console.log('Service worker has been installed');
    })());
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const cachesKeys = await caches.keys();
        const checkKeys = cachesKeys.map(async key => {
            if (![staticCacheName, dynamicCacheName].includes(key)) {
                await caches.delete(key);
            }
        });
        await Promise.all(checkKeys);
        // новый service worker сразу берёт управление открытыми страницами
        await self.clients.claim();
        console.log('Service worker has been activated');
    })());
});

self.addEventListener('fetch', event => {
    const request = event.request;

    // перехватываем только GET-запросы к собственному origin
    // (запросы аналитики и других доменов, а также non-GET не трогаем)
    if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
        return;
    }

    // переходы между страницами: сначала сеть, при отсутствии интернета — из кеша
    if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request));
        return;
    }

    // статика: сначала кеш, при отсутствии в кеше — сеть
    event.respondWith(cacheFirst(request));
});

async function networkFirst(request) {
    const cache = await caches.open(staticCacheName);
    try {
        const response = await fetch(request);
        // кешируем только успешные ответы (ошибки и opaque не сохраняем)
        if (response && response.ok) {
            await cache.put('./index.html', response.clone());
        }
        return response;
    } catch (error) {
        // нет интернета — отдаём приложение из кеша
        const cachedResponse =
            (await cache.match(request)) ||
            (await cache.match('./index.html')) ||
            (await cache.match('./'));
        if (cachedResponse) {
            return cachedResponse;
        }
        return offlineResponse();
    }
}

async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    const cache = await caches.open(dynamicCacheName);
    try {
        const response = await fetch(request);
        // кешируем только успешные ответы (ошибки и opaque не сохраняем)
        if (response && response.ok) {
            await cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        // нет интернета и файла нет в кеше — заглушка
        if (request.destination === 'image') {
            const noImage = await caches.match('./images/no-image.jpg');
            if (noImage) {
                return noImage;
            }
        }
        return offlineResponse();
    }
}

function offlineResponse() {
    return new Response('Нет подключения к интернету', {
        status: 503,
        statusText: 'Offline',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
}
