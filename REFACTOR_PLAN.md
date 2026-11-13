# 整理計畫
最後檢查日期：2026-11-13

> 依 `CLAUDE.md` 檢查 `index.html`（911 行，所有 CSS 與 JS 都寫在同一個檔案內）。
> 一次只做一項；完成後打勾，寫下完成日期與驗證方式。

## 穩定與資安

- [x] #1【風險：低】自訂「其他假」名稱未跳脫就放進 HTML
  - 完成：2026-11-13。4 處改用 `esc()`；以含 `<img onerror>` 的名稱實測，修正前會執行、修正後只顯示文字；8 張截圖與基準一致。
  - 檔案：index.html 第 571、687、709、715 行
  - 問題：「其他假」名稱來自雲端同步的 `data.json`，在假別畫筆（571）、年度畫筆（687）、年度格子 `title`（709）、年度統計列標題（715）直接字串串接進 `innerHTML`，沒有經過 `esc()`。名稱若含 `<`、`"` 會破版，最壞情況可插入程式碼並讀取 localStorage 裡的 GitHub Token。
  - 做法：上述 4 處改用 `esc()` 包住名稱（`l.n`、`t.n`、`YT.find(...).n`、`frow` 的 `lab`、`ABBR[...]`）。
  - 驗證：設定裡把其他假名稱改成 `<b>測</b>` → 畫筆、年度表顯示原文字而非粗體；TEST_CHECKLIST「其他假名稱」「其他假顏色」

- [x] #2【風險：低】唯讀載入失敗時完全沒有提示
  - 完成：2026-11-13。`pullPublic` 非 404 失敗與斷網改為 `console.error`＋同步燈變紅並顯示原因；實測 200／404／500／斷網四種情況，8 張截圖與基準一致。
  - 檔案：index.html 第 902–903 行（`pullPublic`）
  - 問題：`if(!r.ok)return;` 與空的 `catch(e){}` 會吞掉錯誤，沒有 Token 的裝置載入失敗時，同步燈與訊息都不會變，使用者以為看到的是最新班表。
  - 做法：非 404 的失敗與例外改為 `console.error` 並 `setSync('唯讀載入失敗…', true)`；404（雲端尚無資料）維持不提示。
  - 驗證：斷網後開啟 GitHub Pages 網址 → 同步燈變紅並顯示原因；TEST_CHECKLIST「唯讀載入」「同步燈」

- [x] #3【風險：低】GitHub API 回應讀取沒有防缺欄位
  - 完成：2026-11-13。`pull`／`push` 改用 `?.`／`??` 讀取並新增 `reportBadResponse`，格式錯誤顯示「回應格式不正確」、斷網才顯示「連不到 GitHub」；實測 5 種異常回應與三裝置同步，截圖與基準一致。
  - 檔案：index.html 第 866、880 行（`pull`、`push`）
  - 問題：直接讀 `j.sha`、`j.content`、`j.content.sha`，回應格式不符時會被外層 catch 接住，卻顯示錯誤的「連不到 GitHub」。
  - 做法：改用 `j?.sha`、`j?.content?.sha ?? null`，缺欄位時顯示「GitHub 回應格式不正確」並 `console.error`。
  - 驗證：TEST_CHECKLIST「設定 Token」「上傳」「兩台裝置」

- [x] #4【風險：低】其餘空的 `catch {}`（localStorage 讀寫）
  - 完成：2026-11-13。新增 `readStorage`／`writeStorage`／`removeStorage`，7 處改用；失敗時 `console.warn`，寫入失敗時提示一次。實測正常記憶與禁止儲存兩種情況，截圖與基準一致。
  - 檔案：index.html 第 511、536、636、691、854、888、890 行
  - 問題：localStorage 被瀏覽器封鎖或空間不足時完全沒有紀錄，違反「禁止空的 catch」。
  - 做法：新增一個 `readStorage` / `writeStorage` 小工具，失敗時 `console.warn`，七處改用它；畫面行為不變。
  - 驗證：無痕視窗開啟頁面 → 可正常操作、Console 只有警告沒有錯誤；TEST_CHECKLIST「開啟頁面」「手機註記欄切換」

## 設計變數（tokens）

- [x] #5【風險：低】寫死的色碼移到 CSS 變數
  - 完成：2026-11-13。新增 `--shadow-tab`、`--shadow-panel`、`--scrim`、`--on-light-ink`、`--other-preset-1～7`；CSS 5 處、JS 2 處改用變數，變數定義以外的色碼為 0。淺色／深色實測數值不變，截圖與基準一致。
  - 檔案：index.html CSS 第 82、137、214、216、254 行；JS 第 780、784 行
  - 問題：陰影 `rgb(0 0 0 / …)`、彈窗遮罩色、其他假預設色、文字對比色寫死在規則與程式裡。
  - 做法：在 `:root` 新增 `--shadow-*`、`--scrim`、`--other-presets` 等變數，規則改用變數；JS 預設色改從常數讀取。外觀不變。
  - 驗證：淺色與深色模式各截圖比對；TEST_CHECKLIST「深色模式」「其他假顏色」

- [ ] #6【風險：中】抽出 `css/tokens.css`
  - 檔案：index.html、新增 css/tokens.css
  - 問題：所有設計變數（約 50 個，含深色模式三個區塊）寫在 index.html 的 `<style>` 內。
  - 做法：把 `:root` 與兩個深色模式區塊搬到 `css/tokens.css`，index.html 以 `<link>` 引用。依賴 #5。
  - 驗證：淺色、深色、手動切換主題三種狀態截圖與搬移前一致；TEST_CHECKLIST「深色模式」

## HTML

- [ ] #7【風險：低】頁面沒有 `<h1>`
  - 檔案：index.html
  - 問題：移除標題列後整頁沒有 `<h1>`，標題從 `<h2>` 開始。
  - 做法：新增視覺隱藏（只給螢幕閱讀器）的 `<h1>勤休輪值簿</h1>`，畫面不變。
  - 驗證：畫面無變化；用瀏覽器無障礙檢查或螢幕閱讀器確認有 h1

- [ ] #8【風險：低】表單欄位只有 `aria-label`、沒有 `<label>`
  - 檔案：index.html 第 586（表頭姓名）、587（輪序選單）、589（註記欄切換）、596（註記格）、791（自訂顏色）行
  - 問題：動態產生的輸入欄位只靠 `aria-label`，不符合「表單欄位必須有對應的 `<label>`」。
  - 做法：改用視覺隱藏的 `<label for>`，畫面不變。
  - 驗證：TEST_CHECKLIST「人員姓名」「勤務註記」「手機註記欄切換」「鍵盤操作」

- [ ] #9【風險：低】inline `style="..."`（12 處）
  - 檔案：index.html 第 366、391、395、399、404、412、427、725、726、790、792、842 行
  - 問題：版面容器、本月起輸入框、同步燈點、年度統計顏色等使用 inline style。
  - 做法：逐一改成 class，樣式移到 `<style>`。依賴 #5。
  - 驗證：375px 與 1280px 截圖比對；TEST_CHECKLIST「工具帶」「應休天數」「同步燈」

## CSS

- [ ] #10【風險：中】`!important`（10 處）
  - 檔案：index.html CSS 第 11、65、168、174、247、298、305、330、331、335 行
  - 問題：用來蓋過 inline style 與高優先權規則，例如設定頁隱藏班表、休假格底色、註記欄 padding。
  - 做法：完成 #9 後逐一評估，能用調整選擇器或 class 解決的就移除；確實需要的列出來問使用者。依賴 #9。
  - 驗證：TEST_CHECKLIST「手機版面」全部、「設定」頁開關

- [ ] #11【風險：中】用 `#id` 寫樣式（20 處）與巢狀超過 3 層（5 處）
  - 檔案：index.html CSS 第 99、198–212、273、291、298、305、326 行（#id）；第 159、206、262、333 行（巢狀）
  - 問題：`#rtools`、`#lbrushes`、`#opsBar` 等以 id 寫樣式；`.roster tfoot tr:first-child th` 等選擇器過深。
  - 做法：改成 BEM class（例如 `.toolbar--roster`、`.brushbar__group--leave`），一次處理一個區塊。
  - 驗證：375px、1280px、編輯／鎖定兩種狀態截圖比對；TEST_CHECKLIST「工具帶」「固定列」

## JavaScript

- [ ] #12【風險：低】`var onSaved`
  - 檔案：index.html 第 451 行
  - 問題：唯一的 `var`；因為宣告在 `save()` 之後才被同步模組賦值才用 var。
  - 做法：改成 `let`，並確認宣告位置在所有使用之前。
  - 驗證：TEST_CHECKLIST「上傳」「設定 Token」

- [ ] #13【風險：中】同步狀態用訊息文字反推、多個旗標表示同一件事
  - 檔案：index.html 第 824、826–830、871–882 行
  - 問題：同步燈狀態是用正規表示式比對中文訊息（「已同步」「同步中」）判斷；上傳狀態同時用 `pushing`、`pushT` 兩個變數表示。
  - 做法：新增單一 `syncStatus`（`'idle' | 'loading' | 'success' | 'error'`，另加唯讀），狀態字串集中為常數；訊息只負責顯示。
  - 驗證：TEST_CHECKLIST「雲端同步」全部

- [ ] #14【風險：中】`renderYear`、`renderRoster` 過於密集
  - 檔案：index.html 第 579（renderRoster，約 2,200 字元）、694（renderYear，約 2,800 字元）行
  - 問題：行數雖不到 40 行，但每行塞滿多個敘述，換行排版後明顯超過 40 行，難以修改。
  - 做法：各拆成表頭、表身、表尾、統計等小函式，輸出的 HTML 完全相同。
  - 驗證：拆分前後兩個畫面的 `innerHTML` 字串比對一致；TEST_CHECKLIST「月班表」「年度休假」

- [ ] #15【風險：高】JS 拆檔並改用 ES Modules（需拆成多次）
  - 檔案：index.html → js/main.js、js/api.js、js/utils.js、js/constants.js（逐步）
  - 問題：約 460 行 JS 寫在單一 inline `<script>`（IIFE）內，違反「單檔不超過 200 行」「fetch 集中在 api.js」「使用 ES Modules」。
  - 做法：依序拆成小項，每次一個檔案：(a) 純函式到 utils.js（日期、`esc`、base64）(b) 常數到 constants.js（班別、假別、國定假日、儲存鍵名）(c) GitHub 讀寫到 api.js (d) 其餘到 main.js。執行時再細分。
  - 注意：改成 module 後無法用 `file://` 直接開啟，需用本機伺服器或 GitHub Pages 預覽。
  - 驗證：每一小步都跑 TEST_CHECKLIST 全部項目

## 結構

- [ ] #16【風險：高】圖示放在根目錄，與目錄結構不符
  - 檔案：apple-touch-icon.png、favicon-32.png、icon-192.png、icon-512.png、manifest.webmanifest、index.html
  - 問題：圖示應放在 `assets/`。
  - 做法：搬到 `assets/icons/`；受影響路徑：index.html 的 2 個 `<link>`、manifest.webmanifest 的 2 個 `src`。動手前先列出確認。
  - 驗證：TEST_CHECKLIST「網頁圖示」；GitHub Pages 上 Console 沒有 404

- [ ] #17【風險：高】CSS 拆成 base.css、components.css
  - 檔案：index.html、新增 css/base.css、css/components.css
  - 問題：約 350 行 CSS 寫在 index.html 內。
  - 做法：完成 #6、#10、#11 後再進行，一次搬一個區塊。
  - 驗證：375px、768px、1280px 截圖比對；TEST_CHECKLIST 全部

## 檢查中新發現

- [ ] #18【風險：低】唯讀模式載入失敗時沒有「重試」按鈕
  - 檔案：index.html（`renderSync`、`pullPublic`）
  - 問題：規則要求錯誤畫面要有重試按鈕；目前未設定 Token 的裝置載入失敗時只會顯示訊息，要等 60 秒自動重試或切回頁面。
  - 做法：未設定 Token 時，在雲端同步區塊加一顆「重新載入」按鈕呼叫 `pullPublic`（會新增一顆按鈕，動手前先確認外觀）。
  - 驗證：斷網開啟頁面 → 恢復網路後按「重新載入」→ 同步燈恢復「唯讀」；TEST_CHECKLIST「唯讀載入」
