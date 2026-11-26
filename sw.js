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

// 只有首頁本身才存進首頁快取；直接開其他檔案（例如樣式檔）的換頁不攔，避免把首頁快取蓋掉
function isAppPage(request) {
  const path = new URL(request.url).pathname;
  return path === SCOPE_PATH || path === SCOPE_PATH + 'index.html';
}

// 首頁：先抓網路拿最新版；沒網路或超過 4 秒時改用快取。
// 存快取的工作在一開始就登記，就算已經先回應了快取版，新版下載完仍會存起來。
function respondWithPage(event) {
  const fresh = fetch(event.request);
  const copy = fresh.then((res) => (res.ok ? res.clone() : null));
  event.waitUntil(copy
    .then(async (res) => { if (res) await (await caches.open(CACHE_NAME)).put(PAGE_KEY, res); })
    .catch((err) => console.error('首頁快取更新失敗（可能沒有網路）', err)));
  return pageOrCached(fresh);
}

async function pageOrCached(fresh) {
  const cached = await (await caches.open(CACHE_NAME)).match(PAGE_KEY);
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
  const request = event.request;
  if (!isOwnRequest(request)) return;
  if (request.mode !== 'navigate') { event.respondWith(respondWithAsset(request)); return; }
  if (isAppPage(request)) event.respondWith(respondWithPage(event));
});
