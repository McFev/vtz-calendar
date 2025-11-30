const staticCacheName = 'static-cache-v1_0_19';
const dynamicCacheName = 'dynamic-cache-v1_0_19';

const staticAssets = [
    './',
    './index.html',
    './images/icons/apple-touch-icon.png',
    './images/icons/web-app-manifest-192x192.png',
    './images/icons/web-app-manifest-512x512.png',
    './images/icons/web-app-manifest-monochrome-192x192.png',
    './images/icons/web-app-manifest-monochrome-512x512.png',
    './js/app.js',
    './images/no-image.jpg',
    './images/refresh.svg',
    './images/install.svg',
    './images/today.svg',
    './images/day.svg',
    './images/night.svg',
    './images/about.svg'
];

self.addEventListener('install', async event => {
    const cache = await caches.open(staticCacheName);
    await cache.addAll(staticAssets);
    console.log('Service worker has been installed');
});

self.addEventListener('activate', async event => {
    const cachesKeys = await caches.keys();
    const checkKeys = cachesKeys.map(async key => {
        if (![staticCacheName, dynamicCacheName].includes(key)) {
            await caches.delete(key);
        }
    });
    await Promise.all(checkKeys);
    console.log('Service worker has been activated');
});

self.addEventListener('fetch', event => {
    console.log(`Trying to fetch ${event.request.url}`);
    event.respondWith(checkCache(event.request));
});

async function checkCache(req) {
    const cachedResponse = await caches.match(req);
    return cachedResponse || checkOnline(req);
}

async function checkOnline(req) {
    const cache = await caches.open(dynamicCacheName);
    try {
        const res = await fetch(req);
        await cache.put(req, res.clone());
        return res;
    } catch (error) {
        const cachedRes = await cache.match(req);
        if (cachedRes) {
            return cachedRes;
        } else if (req.url.indexOf('.html') !== -1) {
            return caches.match('./index.html');
        } else {
            return caches.match('./images/no-image.jpg');
        }
    }
}
