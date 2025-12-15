// Service Worker 版本號 (修改程式後記得改這裡，例如變 v2)
const CACHE_NAME = 'anime-input-v10.1';

// 要快取的檔案清單
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './dashboard.html',
  './manage.html',
  './overview.html',
  './styles.css',
  './app.js',
  './images/icon-192.png',
  './images/icon-512.png',
  './manifest.json'
];

// 1. 安裝 (Install) - 下載檔案到快取
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching all assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. 啟動 (Activate) - 清除舊快取 (避免快取地獄的關鍵!)
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

// 3. 攔截請求 (Fetch) - 沒網路用快取，有網路優先嘗試網路
// 這裡使用 "Network First" 策略，適合開發階段，讓你看到的總是最新版
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        // 如果網路斷了，就去快取拿
        return caches.match(event.request);
      })
  );
});
