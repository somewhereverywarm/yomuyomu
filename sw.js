/**
 * よむよむ - Service Worker
 * オフライン対応とキャッシュ管理
 */

const CACHE_NAME = 'yomuyomu-v2';

// インストール時
self.addEventListener('install', (event) => {
    console.log('Service Worker: インストール');
    self.skipWaiting();
});

// アクティベート時
self.addEventListener('activate', (event) => {
    console.log('Service Worker: アクティベート');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
});

// リクエスト時
self.addEventListener('fetch', (event) => {
    // API呼び出しはキャッシュしない
    if (event.request.url.includes('api.anthropic.com')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // 成功したらキャッシュに保存
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // オフライン時はキャッシュから返す
                return caches.match(event.request);
            })
    );
});
