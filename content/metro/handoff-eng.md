# 派工單：Savvy 官網自動同步捷運美食清單（GTM → @Engineering Lead）

| 欄位 | 內容 |
|---|---|
| 任務 | 做一個自動流程（例如 GitHub Action）：偵測到新的或有變更的 `stations.json`／`savvy-ready/<日期>/web.json`，就自動更新 Savvy 官網的捷運美食清單頁（含每站頁與圖片）。 |
| 背景 | 創辦人 11/1 發現已發的貼文都沒同步到官網，核准「已發的捷運美食清單同步到官網，並做 action 連上去」。目前已發 12 站（#1 小巨蛋 ～ #12 古亭），每天 19:00 新增一站。GTM 只產內容檔，不碰官網、程式碼和 repo。 |
| 交付物 | 1) 讀 stations.json 產生清單頁＋每站頁（站名、tagline、店家 📌名稱／推薦菜／價格與出處／📍地址／🚇出口步行／⏰時間、圖片、IG/Threads 連結）；2) 偵測新 web.json 自動加一站的 action；3) 一段說明：內容檔要放到哪裡（repo 路徑或上傳方式）才會觸發。 |
| 驗收條件 | ① 12 站全部出現在官網且欄位與 stations.json 一致；② `null` 欄位整行不顯示（不顯示「未取得」）；③ 忽略所有 `_` 開頭的鍵；④ 新增一個測試 web.json 後，不需手動操作即可在官網看到；⑤ 同一 `n` 重複送不會出現兩筆；⑥ 頁面有「營業時間、價格可能調整，出發前再確認」；⑦ 圖片能載入、不破版。 |
| 期限 | 未取得（創辦人沒有指定；建議 11/8 前上線，請工程評估回報） |
| 存放路徑 | 內容：`/workspace/shared/gtm/2026-11-01-website-sync/`（stations.json、schema.md、images/、gaps.json）；每日新站：`/workspace/shared/gtm/savvy-ready/<YYYY-MM-DD>/web.json` |
