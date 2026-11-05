# Savvy 官網捷運美食清單：內容檔格式（v1，2026-11-01）

## 檔案
- `stations.json`：陣列，一站一筆，依 `n` 排序。現有 #1–#12。
- 每日新站：GTM 上傳到 git 分支 `gtm/inbox/<YYYY-MM-DD>/web.json`（見 `docs/GTM-INBOX.md`），內容是**單一站物件**（格式同 stations.json 的一筆）。Actions 會同步進 `content/metro/daily/<YYYY-MM-DD>/web.json`。
- 圖片：`images/<NN>-<slug>/photos/*.jpg`（各店底圖）、`images/<NN>-<slug>/slides/*.png`（輪播 1080×1350）。web.json 內的圖片路徑相對於該日資料夾（`photos/…`、`slides/…`）。
- `gaps.json`：每站缺漏欄位（給人看，網站不需讀）。

## 站物件欄位
| 欄位 | 型別 | 說明 |
|---|---|---|
| n | int | 第幾站（唯一鍵） |
| date | string YYYY-MM-DD | 發文日（Asia/Shanghai） |
| station | string | 站名 |
| slug | string | 英文代稱，用於網址與圖片資料夾 |
| tagline | string | 一句話副標（取自 data.json；沒有就取貼文第一行） |
| shops | array | 店家，通常 5 間（#1、#2 只有 4 間） |
| images.photos / images.slides | string[] | 圖片相對路徑 |
| posts.instagram / threads / xiaohongshu | string \| null | 已發貼文網址 |
| sources | string[] \| null | 本站全部查證連結 |
| _source_files | object | 內部欄位：抽取來源檔。**`_` 開頭的鍵網站要忽略** |
| map | object | **網站建置後必填**（由 `content/metro/design-stations.json` 套用）。daily `web.json` **不得**帶 `map`／`map_id`（見 F-6）。座標唯一來源是 DESIGN：`{"line": "L_red"\|"L_blue"\|"L_green"\|"L_orange", "at": [x, y], "label"?: "left"\|"right"}`。`at` 是示意圖 viewBox 單位。缺 DESIGN 條目時 build 失敗 |
| map_id | string | 選填。舊首頁站點 id；新站不要填。daily `web.json` 不得帶此欄（F-6）；DESIGN／stations.json 才可保留 |

## shop 欄位
| 欄位 | 說明 |
|---|---|
| key | **必填且站內唯一**。對應 photos/<key>.jpg（或 webp/png/jpeg），須恰好一張；建置會檢查，不可用照片陣列順序配對 |
| name | 店名 |
| dish | 推薦菜 |
| price | 價格字串，例如 "$60" |
| price_source | 價格出處與日期，例如 "2026/05 食記" |
| address | 地址 |
| exit_walk | 出口與步行時間 |
| hours | 營業時間（含公休） |
| sources | 這間店的查證連結（部分舊站沒有 https 前綴） |

## 規則
- 查不到一律 `null`，不編造、不寫「未取得」。
- 事實以實發貼文為準（#1–#7 取自 f1-evidence 實發全文，其餘取自當日 ig.txt / threads.txt / data.json）。
- 價格與營業時間可能變動，網站請顯示「出發前再確認」。
- 新增一站：GTM 把日期包上傳到 `gtm/inbox/<YYYY-MM-DD>/`（見 `docs/GTM-INBOX.md`）；站點基底仍以 `stations.json` 的 `n` 為鍵（重複就覆蓋，不要新增第二筆）。
- 新站座標只採用 DESIGN（`content/metro/design-stations.json`）核准的位置；daily `web.json` 不得帶 `map`／`map_id`，缺 DESIGN 條目時 build 會失敗。

`map.labelOffset` 可選，格式 `[dx, dy]`（兩個有限數字，CSS px），用來在 `label` 預設位置上再微調站名；目前小巨蛋 `[-14, 0]`、雙連 `[0, 12]`，格式錯誤時 build 會失敗（`map.labelOffset must be [dx, dy]`）。只影響互動地圖時用這個欄位。

`map.posterLabelOffset` 可選，格式同上，**只給無 JS 海報（`HeroMapPoster`）用**；有設定時會取代海報上的 `labelOffset`，互動地圖不受影響（DESIGN r15）。目前士林 `[20, 0]`、南京復興 `[-22, 0]`、忠孝復興 `[0, 12]`、古亭 `[-22, 0]`。格式錯誤時 build 會失敗（`map.posterLabelOffset must be [dx, dy]`）。

站名使用 `label` 對應的預設位置；古亭使用 `"label": "left"`。所有站點的 `at` 與線上吸附點距離須在 2 個 viewBox 單位以內。

首頁照片圖釘、店家數和卡片內容由同一份文章的 `shops` 與 `images.photos` 自動產生。只需更新 stations.json 或 daily web.json 與照片，不用另改 data/metro.json。店名／配圖缺漏或 key 重複會讓建置失敗。

## GTM inbox（2026-11-05）
- 上傳入口改為 git 分支 `gtm/inbox`／`<YYYY-MM-DD>/`（見 `docs/GTM-INBOX.md`），不再依賴本機 `/workspace/shared/gtm/savvy-ready`。
- 地圖座標的唯一核准來源：`content/metro/design-stations.json`（DESIGN）。daily `web.json` 不得帶 `map`／`map_id`；build 會套用 DESIGN 並在缺條目時失敗。
- 內容 auto-merge 只允許 `content/metro/daily/**/web.json` 與 `content/metro/images/<NN-slug>/{photos,slides}/*`。
