# 勤休輪值簿

輪班排班與年度休假管理的單頁網頁，由 Excel 班表改寫。

- **月班表**：班別／假別畫筆點選排班、依輪序自動填入多個月、勤務註記、從 Excel 貼上。
- **年度休假**：12 個月週對齊總覽，休假、補休 24 時、其他假、停休、國外專案自動統計。

直接用瀏覽器開啟 `index.html` 即可使用；資料存在瀏覽器的 localStorage。

## 電腦、手機同步

班表可以存成**私人 repo** 裡的 `data.json`，各裝置每 30 秒、或切回頁面時自動同步。

1. 建一個**私人** repo，例如 `comfort527/duty-roster-data`（勾選 Add a README）。
2. 到 GitHub → Settings → Developer settings → Fine-grained tokens 建立 Token：
   只授權 `duty-roster-data` 這個 repo，權限 **Contents: Read and write**。
3. 用 GitHub Pages 網址開啟網頁，在「雲端同步」按「設定 GitHub 同步」，填入 repo 與 Token。每台裝置設定一次。

Token 只存在各裝置的瀏覽器，不會寫進網頁或 repo。
