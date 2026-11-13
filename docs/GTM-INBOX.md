# GTM → 官網：inbox 上傳契約（v1）

對象：GTM。目標：貼文發完後，把 `web.json` 與圖片推上 repo 的 `gtm/inbox` 分支；**不要**直接改 `main`。每天約 20:17（Asia/Shanghai）的 Actions 會掃描**所有**尚未同步的完整交付包，開只含內容的 PR；CI 綠了走既有 auto-merge。Vercel 正式站部署與 CI 綠燈是兩件事，合併後請再確認官網。

## 交付包目錄（本機）

```
2026-11-05/
  manifest.json
  web.json
  photos/<key>.webp
  slides/01-cover.webp
  ...
```

### `manifest.json`

```json
{
  "schema_version": 1,
  "delivery_version": "2026-11-05.1",
  "date": "2026-11-05",
  "station_n": 15,
  "slug": "chiang-kai-shek-memorial-hall",
  "station": "中正紀念堂",
  "ready_for_site": true,
  "files": {
    "web_json": "web.json",
    "photos": ["photos/dingyuan.webp", "photos/hehuan.webp"],
    "slides": ["slides/01-cover.webp", "slides/02-dingyuan.webp"]
  }
}
```

規則：

- `ready_for_site` 必須是 `true` 才會被排程處理；草稿可先上傳但請設 `false`。
- `web.json` **禁止**帶 `map` / `map_id`。示意地圖座標只存在 main 上的 `content/metro/design-stations.json`，並以 `(city, n)` 對應。
- 省略 `city` 時，若 slug 只屬於一座城市（例如 `shanghai-yuyuan`），inbox 用那一座；否則視為 `taipei`。不要把上海的 `n` 對到台北同一號。
- `files.photos`、`files.slides`、`files.slides_zh`、`files.slides_en` 可以是陣列或 `null`。路徑前綴分別是 `photos/`、`slides/`、`slides_zh/`、`slides_en/`。
- 地理座標與價格只採用包內欄位。`lat`／`lng`／`price` 為 `null` 就保持 `null`，不要另找參考座標或補價。
- 圖片檔名僅英數、`-`、`_`；副檔名 `webp`（建議）或 `jpg`/`jpeg`/`png`。
- 同一站內容有改，請提高 `delivery_version`；排程用 `delivery_version + content hash` 去重。

### 上傳

在已 clone 的 `SAV-E-landing` 裡（需能 `git push` / `gh`）：

```bash
node scripts/gtm-inbox-upload.mjs --dir /path/to/2026-11-05
# 先檢查：
node scripts/gtm-inbox-upload.mjs --dir /path/to/2026-11-05 --dry-run
```

腳本只推 `gtm/inbox`，路徑為 `<date>/…`。Actions **只讀**這個分支。

## DESIGN 座標

新站上線前，必須先有一筆人工 PR 把該站寫進 `content/metro/design-stations.json`（`city` / `n` / `slug` / `station` / `map`）。示意 `map` 缺該城該站時，排程會停這包、**不改官網**，並開／更新同一則 issue。`lat`／`lng` 為空只表示地理座標 pending，不會拿別的數來填，也不會因此擋掉已有示意 `map` 的包。

內容 PR 的每日 JSON 都走 `(city, n)` 路徑：`content/metro/daily/taipei/<date>/web.json` 與 `content/metro/daily/shanghai/<date>/web.json`。上海圖片是 `content/metro/images/shanghai/<NN-slug>/...`。台北圖片仍放 `content/metro/images/<NN-slug>/...`，因為建置會先讀這個既有資料夾。更早的 `content/metro/daily/<date>/web.json` 仍會被建置讀取。只含這些每日 JSON 與圖片時可自動合併。

## 手動重跑

GitHub → Actions → **Metro GTM inbox sync** → Run workflow。排程可能延遲或漏跑；漏了也不怕，下次會掃全部未同步包。

## 失敗時

缺座標、缺圖、資料不合法、或內容 PR 的 CI 失敗：該包停止，官網維持原樣。Issue 標題固定為 `[metro-inbox] blocked: station <n> <name>`，補件後下次排程接續，不會每天開新 issue。
