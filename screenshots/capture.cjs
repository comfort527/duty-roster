// 截圖基準與比對（需要 Node.js 與 Playwright；不屬於網站本身）
//   建立基準：node screenshots/capture.cjs baseline
//   比對現況：node screenshots/capture.cjs compare
// 固定日期為 2026-11-13、擋掉 GitHub 同步，使用示範資料，確保每次畫面一致。
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const PAGE_URL = 'file://' + path.join(ROOT, 'index.html');
const FIXED_TIME = new Date('2026-11-13T10:00:00+08:00');
const WIDTHS = [
  { name: '375', viewport: { width: 375, height: 812 }, phone: true },
  { name: '1280', viewport: { width: 1280, height: 800 }, phone: false },
];
const SHOTS = [
  { name: 'roster', hash: '' },
  { name: 'roster-editing', hash: '', editing: true },
  { name: 'year', hash: '#year' },
  { name: 'settings', hash: '#tools', editing: true },
];

async function openPage(browser, width, shot, consoleLog) {
  const context = await browser.newContext({ viewport: width.viewport, deviceScaleFactor: 1, isMobile: width.phone, hasTouch: width.phone });
  await context.route('https://raw.githubusercontent.com/**', (route) => route.fulfill({ status: 404, body: '' }));
  await context.route('https://api.github.com/**', (route) => route.fulfill({ status: 404, body: '{}' }));
  const page = await context.newPage();
  await page.clock.install({ time: FIXED_TIME });
  page.on('console', (msg) => {
    if (msg.type() !== 'error' && msg.type() !== 'warning') return;
    // 擋掉同步造成的 404 是測試刻意安排的，不算網站錯誤
    if (/raw\.githubusercontent\.com|api\.github\.com/.test(msg.location()?.url ?? '')) return;
    consoleLog.push(`[${width.name}/${shot.name}] ${msg.type()}: ${msg.text()}`);
  });
  page.on('pageerror', (err) => consoleLog.push(`[${width.name}/${shot.name}] pageerror: ${err.message}`));
  await page.goto(PAGE_URL);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  if (shot.editing) await page.click('#rtools .lockbtn');
  if (shot.name === 'settings' && !width.phone) await page.click('#seqBtn');
  else if (shot.hash) await page.evaluate((h) => { location.hash = h; }, shot.hash);
  // 切換畫面後可能用到新的字，字型會再分批下載；等它載完再拍，避免每次反鋸齒不同
  await page.waitForTimeout(150);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  return { context, page };
}

async function captureAll(outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const consoleLog = [];
  for (const width of WIDTHS) {
    for (const shot of SHOTS) {
      const { context, page } = await openPage(browser, width, shot, consoleLog);
      await page.screenshot({ path: path.join(outDir, `${shot.name}-${width.name}.png`), animations: 'disabled', caret: 'hide' });
      await context.close();
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(outDir, 'console.txt'), consoleLog.join('\n') || '（沒有 Console 錯誤或警告）');
  return consoleLog;
}

async function countDiffPixels(page, fileA, fileB) {
  const toUrl = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
  return page.evaluate(async ([a, b]) => {
    const load = (src) => new Promise((ok) => { const img = new Image(); img.onload = () => ok(img); img.src = src; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    if (ia.width !== ib.width || ia.height !== ib.height) return { sizeChanged: true, diff: -1 };
    const read = (img) => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, c.width, c.height).data; };
    const da = read(ia); const db = read(ib); let diff = 0;
    for (let i = 0; i < da.length; i += 4) {
      if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 30) diff++;
    }
    return { sizeChanged: false, diff };
  }, [toUrl(fileA), toUrl(fileB)]);
}

async function compare() {
  const base = path.join(__dirname, 'baseline');
  const cur = path.join(__dirname, 'current');
  if (!fs.existsSync(base)) { console.error('找不到 screenshots/baseline/，請先執行 baseline。'); process.exit(1); }
  const consoleLog = await captureAll(cur);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  // 300 像素以下且散在各處，多半是文字反鋸齒的偶發差異；重跑一次通常就消失
  const NOISE = 300;
  let changed = 0, noisy = 0;
  for (const file of fs.readdirSync(base).filter((f) => f.endsWith('.png'))) {
    const res = await countDiffPixels(page, path.join(base, file), path.join(cur, file));
    const small = !res.sizeChanged && res.diff > 0 && res.diff <= NOISE;
    const label = res.sizeChanged ? '尺寸不同' : res.diff === 0 ? '相同' : small ? `${res.diff} 個像素不同（極少量，可重跑確認）` : `${res.diff} 個像素不同`;
    if (small) noisy++; else if (res.diff !== 0) changed++;
    console.log(`${file}：${label}`);
  }
  await browser.close();
  console.log(consoleLog.length ? 'Console：\n' + consoleLog.join('\n') : 'Console：沒有錯誤或警告');
  if (changed) console.log(`有 ${changed} 張畫面明顯不同，請打開 screenshots/current/ 對照。`);
  else if (noisy) console.log(`沒有明顯變化；${noisy} 張只有極少量差異（多半是文字反鋸齒），可重跑確認。`);
  else console.log('所有畫面與基準一致。');
}

(async () => {
  const mode = process.argv[2];
  if (mode === 'baseline') {
    const log = await captureAll(path.join(__dirname, 'baseline'));
    console.log('已建立基準：screenshots/baseline/');
    console.log(log.length ? 'Console：\n' + log.join('\n') : 'Console：沒有錯誤或警告');
  } else if (mode === 'compare') {
    await compare();
  } else {
    console.log('用法：node screenshots/capture.cjs baseline | compare');
  }
})();
