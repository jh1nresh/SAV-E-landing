# Savvy 官網捷運美食清單：內容檔格式（v1，2026-11-01）

## 檔案
- `stations.json`：陣列，一站一筆，依 `n` 排序。現有 #1–#12。
- 每日新站：`/workspace/shared/gtm/savvy-ready/<YYYY-MM-DD>/web.json`，內容是**單一站物件**（格式同 stations.json 的一筆）。GTM 每天 17:00 產出時一起寫。
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

## shop 欄位
| 欄位 | 說明 |
|---|---|
| key | 圖片檔名代稱（photos/<key>.jpg），舊站可能 null |
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
- 新增一站：GTM 寫 `savvy-ready/<日期>/web.json`；同時把該站附加到 `stations.json`（以 `n` 為鍵，重複就覆蓋，不要新增第二筆）。
