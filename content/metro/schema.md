# Savvy 官網捷運美食清單：內容檔格式（v1，2026-11-01）

## 檔案
- `stations.json`：陣列，一站一筆，依 `(city, n)` 排序（省略 `city` 視為 `taipei`）。台北目前是該城 #1–#16；每一城的站數以該城資料筆數為準，不把某個數字當全域站數。
- 每日新站：GTM 上傳到 git 分支 `gtm/inbox/<YYYY-MM-DD>/web.json`（見 `docs/GTM-INBOX.md`），內容是**單一站物件**（格式同 stations.json 的一筆）。Actions 會同步進 `content/metro/daily/<YYYY-MM-DD>/web.json`。
- 圖片：`images/<NN>-<slug>/photos/*.jpg`（各店底圖）、`images/<NN>-<slug>/slides/*.png`（輪播 1080×1350）。web.json 內的圖片路徑相對於該日資料夾（`photos/…`、`slides/…`）。
- `gaps.json`：每站缺漏欄位（給人看，網站不需讀）。

## 站物件欄位
| 欄位 | 型別 | 說明 |
|---|---|---|
| n | int | 該城市內的站號，從 1 起。唯一鍵是 `(city, n)`，不是全域 `n` |
| city | `taipei` \| `shanghai` | 省略時視為 `taipei`。上海包必須寫 `shanghai`，或放在 `daily/shanghai/<date>/` |
| date | string YYYY-MM-DD | 發文日（Asia/Shanghai） |
| station | string | 站名 |
| slug | string | 英文代稱，用於網址與圖片資料夾 |
| tagline | string | 一句話副標（取自 data.json；沒有就取貼文第一行） |
| shops | array | 店家，通常 5 間（#1、#2 只有 4 間） |
| images.photos / images.slides | string[] \| null | 圖片相對路徑。`null` 視為空陣列，不中斷建置 |
| images.slides_zh / images.slides_en | string[] \| null | 依語系選輪播。`zh` 用 `slides_zh`，`en` 用 `slides_en`；該欄是 `null` 或不存在時才退回 `images.slides` |
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
- 新增一站：GTM 把日期包上傳到 `gtm/inbox/<YYYY-MM-DD>/`（見 `docs/GTM-INBOX.md`）。合併鍵是 `(city, n)`；省略 `city` 視為 `taipei`。同一城市的同一個 `n` 以後到的資料覆蓋該城那一站，不另開第二筆，也不覆蓋另一個城市的同號站。
- 新站座標只採用 DESIGN（`content/metro/design-stations.json`）核准的位置；daily `web.json` 不得帶 `map`／`map_id`，缺 DESIGN 條目時 build 會失敗。

`map.labelOffset` 可選，格式 `[dx, dy]`（兩個有限數字，CSS px），用來在 `label` 預設位置上再微調站名；目前小巨蛋 `[-14, 0]`、雙連 `[0, 12]`，格式錯誤時 build 會失敗（`map.labelOffset must be [dx, dy]`）。只影響互動地圖時用這個欄位。

`map.posterLabelOffset` 可選，格式同上，**只給無 JS 海報（`HeroMapPoster`）用**；有設定時會取代海報上的 `labelOffset`，互動地圖不受影響（DESIGN r15）。目前士林 `[20, 0]`、南京復興 `[-22, 0]`、忠孝復興 `[0, 12]`、古亭 `[-22, 0]`。格式錯誤時 build 會失敗（`map.posterLabelOffset must be [dx, dy]`）。

站名使用 `label` 對應的預設位置；古亭使用 `"label": "left"`。所有站點的 `at` 與線上吸附點距離須在 2 個 viewBox 單位以內。

首頁照片圖釘、店家數和卡片內容由同一份文章的 `shops` 與 `images.photos` 自動產生。只需更新 stations.json 或 daily web.json 與照片，不用另改 data/metro.json。店名／配圖缺漏或 key 重複會讓建置失敗。

## GTM inbox（2026-11-05）
- 上傳入口改為 git 分支 `gtm/inbox`／`<YYYY-MM-DD>/`（見 `docs/GTM-INBOX.md`），不再依賴本機 `/workspace/shared/gtm/savvy-ready`。
- 地圖座標的唯一核准來源：`content/metro/design-stations.json`（DESIGN）。daily `web.json` 不得帶 `map`／`map_id`；build 會套用 DESIGN 並在缺條目時失敗。
- 內容 auto-merge 只允許每日 `web.json` 與站圖：`content/metro/daily/[taipei|shanghai/]YYYY-MM-DD/web.json`，以及 `content/metro/images/[taipei|shanghai/]<NN-slug>/{photos,slides,slides_zh,slides_en}/*`。程式、`stations.json`、`design-stations.json`、schema、workflow 仍不可自動合併。
- 站號依城市分開，從 1 起。台北 `n=2`（饒河/松山）與上海 `n=2`（豫園）是不同站。
- 示意座標仍只採用 `design-stations.json` 的 `map`（台北 `L_*`，上海 `SH_*`，各用該城線網吸附）。daily `web.json` 仍不得帶 `map`／`map_id`。
- 地理座標 `lat`／`lng` 使用 `datum` 或 `coord_system` 為 `"WGS-84"` 的欄位。缺座標、`null` 或「未取得」是 pending，不讓建置失敗。`verified.geo` 不是 `true` 的站不產生地理 pin（示意 `map.at` 仍留給已核准的台北地圖）。
- `metro_lines` 是該城市的路線編號陣列（上海例如 `["1","14"]`），跟示意 `map.line`（`L_*`／`SH_*`）分開。沒有這個欄位時不從 DESIGN 的 `lines` 補上。
- 價格同樣只留包內原值，`null` 不補數字。
