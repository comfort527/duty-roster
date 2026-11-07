# 勤休輪值簿

輪班排班與年度休假管理的單頁網頁，由 Excel 班表改寫。

- **月班表**：班別／假別畫筆點選排班、依輪序自動填入多個月、勤務註記、從 Excel 貼上。
- **年度休假**：12 個月週對齊總覽，休假、補休 24 時、其他假、停休、國外專案自動統計。

直接用瀏覽器開啟 `index.html` 即可使用；資料存在瀏覽器的 localStorage。

## 電腦、手機同步

班表存在本 repo 的 `data` 分支（`data.json`），不會觸發網頁重新部署。

- **沒有 Token 的裝置**：自動以唯讀方式載入 GitHub 上的班表，每分鐘更新。
- **要修改並上傳**：到 GitHub → Settings → Developer settings → Fine-grained tokens 建立 Token，
  只授權 `duty-roster` 這個 repo，權限 **Contents: Read and write**；
  在網頁「雲端同步」按「設定 GitHub 同步」貼上 Token。每台裝置設定一次。

修改 3 秒後自動上傳，其他裝置每 30 秒或切回頁面時同步。Token 只存在各裝置的瀏覽器。
