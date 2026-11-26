// 勤休輪值簿的離線快取（Service Worker）
// 必須放在網站根目錄，才能管到首頁；放進資料夾就只能管那個資料夾。
// 同一個 comfort527.github.io 網域下還有其他網頁 App，為了互不干擾：
//   1. 只處理本 App 範圍（/duty-roster/）內的網址，GitHub 同步、字型、其他 App 一律不攔
//   2. 快取名稱一律以 duty-roster- 開頭，清理舊快取時只刪自己的
const CACHE_PREFIX = 'duty-roster-';
const CACHE_NAME = CACHE_PREFIX + 'v1';
const SCOPE_PATH = new URL(self.registration.scope).pathname;
const PAGE_KEY = './';
const PAGE_TIMEOUT_MS = 4000; // 網路太慢時，先顯示快取的版本

// 從首頁 HTML 找出樣式、圖示、manifest 的網址（版本號改了也會自動跟上）
function listShellAssets(html) {
  const urls = new Set();
  const pattern = /(?:href|src)="((?:css|assets)\/[^"]+|manifest\.webmanifest[^"]*)"/g;
  for (const match of html.matchAll(pattern)) urls.add(match[1]);
  return [...urls];
}

async function precacheShell() {
  const cache = await caches.open(CACHE_NAME);
  const page = await fetch(PAGE_KEY, { cache: 'reload' });
  if (!page.ok) throw new Error('首頁下載失敗：' + page.status);
  const html = await page.clone().text();
  await cache.put(PAGE_KEY, page);
  await Promise.all(listShellAssets(html).map((url) =>
    cache.add(new Request(url, { cache: 'reload' })).catch((err) => console.error('預先快取失敗', url, err))));
}

async function removeOldCaches() {
  const keys = await caches.keys();
  const old = keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME);
  await Promise.all(old.map((key) => caches.delete(key)));
}

function isOwnRequest(request) {
  const url = new URL(request.url);
  return request.method === 'GET' && url.origin === self.location.origin && url.pathname.startsWith(SCOPE_PATH);
}

// 首頁：先抓網路拿最新版；沒網路或太慢時改用快取
async function respondWithPage(event) {
  const cache = await caches.open(CACHE_NAME);
  const fresh = fetch(event.request).then((res) => {
    if (res.ok) event.waitUntil(cache.put(PAGE_KEY, res.clone()));
    return res;
  });
  const cached = await cache.match(PAGE_KEY);
  if (!cached) return fresh;
  const slow = new Promise((resolve) => setTimeout(() => resolve(cached), PAGE_TIMEOUT_MS));
  return Promise.race([fresh.catch(() => cached), slow]);
}

// 樣式與圖示：網址帶版本號，先用快取，沒有才抓網路並存起來
async function respondWithAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) await cache.put(request, res.clone());
  return res;
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(removeOldCaches().then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  if (!isOwnRequest(event.request)) return;
  event.respondWith(event.request.mode === 'navigate' ? respondWithPage(event) : respondWithAsset(event.request));
});
