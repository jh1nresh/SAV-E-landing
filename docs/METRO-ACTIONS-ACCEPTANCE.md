# Metro inbox Actions — 驗收情境

合併本自動化 PR、裝好 GitHub App、且 DESIGN 已預先寫好座標後，用下列情境驗收。每一項通過再宣告「日常不用 agent」。

| # | 情境 | 操作 | 期望 |
|---|---|---|---|
| 1 | 正常新增 | 上傳完整 `ready_for_site:true` 包到 `gtm/inbox`；手動跑 sync | 開內容 PR，僅 daily JSON + images；gate+CI 綠後 squash auto-merge；**另外**確認 Vercel 正式站已更新 |
| 2 | 重複交付 | 同一 `delivery_version` + 相同檔案再跑 sync | 不開新 PR；若已有 open PR 且 body 含同一 dedupe key 則跳過 |
| 3 | 缺座標 | 包的 `station_n` 不在 `design-stations.json` | 不開內容 PR、不改 main；開／更新同一則 `[metro-inbox] blocked:` issue |
| 4 | 夾帶程式檔 | 有人對內容分支塞 `*.ts` / `build.py` / workflow | automerge gate `eligible=false`；不 auto-merge |
| 5 | CI 失敗 | 內容不合法（缺圖、壞 JSON） | validate 失敗；不 merge；官網不變；可再開 issue（視失敗點） |
| 6 | 漏日補跑 | inbox 上留兩天未同步的 ready 包；只跑一次 sync | 兩包都處理（或各開／更新對應 PR）；不是只讀「今天」 |

## 明確不在自動化範圍

- 改 renderer、map SVG、測試期待值、站數硬編碼 → 走人工／agent PR（例如第 15 站 #42）。
- 覆寫 DESIGN 座標 → 拒絕；`web.json` 帶 `map` 會被判定失敗。
