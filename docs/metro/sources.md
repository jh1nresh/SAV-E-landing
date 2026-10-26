# Savvy 捷運美食首頁：來源與交付紀錄

查看與製作日期：**2026/10/25（Asia/Shanghai）**。

## 範圍與設計選擇

本次是獨立、本機、單檔 HTML 的互動原型；交付終點為可離線開啟且完成桌面／手機驗證的檔案。不部署、不上線、不更改 iOS 程式或產品狀態，不建立 PR，不發送外部訊息。原型遵循本次使用者定義的「台灣捷運美食清單」，不是現有原生 App 的 clue／Review Candidate／Map Stamp 流程。

已閱讀兩套資源後選擇 **colorfigures（April Zhu）**：三階平塗、手繪墨線與具象小建築適合美食手帳；**anatomy（wheresryan22，MIT）**的精密零件、四階明暗、單色與機構解說更適合技術圖解，這次不採用其程式碼。

- colorfigures：<https://april-zhu.com/colorfigures/colorfigures.tar.gz>。閱讀 SKILL.md、assets/core.js 與 assets/examples/toaster.html。使用引擎的投影、box、loft、shape、line 等幾何產生器，在建置時輸出 SVG；不掛載其會替換 document.body 的展示頁框架。
- anatomy：<https://github.com/wheresryan22/anatomy>。閱讀 SKILL.md、examples/dial-indicator/build.mjs、kit/iso-kit.mjs、references/craft.md，並檢視 examples／kit／references 的結構。
- 本次指定視覺優先：紙底 #f5f0e5、深藍墨線 #24394b（主要外框約 1.2px）、暖灰短陰影 #ddd4c3。建築各材質固定三階色；線路有各自識別色。標籤另置於不被建築遮擋的正面牌面。
- 建築是虛構的站點主題小模型，並非測繪或特定商家的真實外觀；台北小巨蛋採場館意象。
- 原生 App 的 DESIGN.md／Color+Theme.swift 已檢查。本原型依本次明確色碼與產品要求，不修改該套原生 token。

## 路線與站名：可靠公開來源

只使用公開**文字車站資料**核對，再自行繪製幾何。未下載、嵌入或描摹官方路線圖圖檔，未使用台北捷運 logo。這是市中心路段節選，未畫的延伸段、支線和其他系統不表示不存在；不是完整路網，也不是導航工具。頁面沒有「共 N 站」數字。

所有下列來源於 2026/10/25 查看：

| 來源 | 本次核對內容 |
| --- | --- |
| [臺北市政府捷運工程局：淡水線路線說明](https://www.dorts.gov.taipei/cp.aspx?n=0AC527D5FC9E596A) | 圓山、民權西路、雙連、中山、台北車站、台大醫院、中正紀念堂站序；R12 雙連及換乘關係。 |
| [捷運工程局：信義線路線說明](https://www.dorts.gov.taipei/cp.aspx?n=0AC527D5FC9E596A&s=CB7BC86DBDA1E44D) | 中正紀念堂到象山這一繪製區段；東門 R07/O06、大安 R05/BR09，以及大安森林公園位於東門與大安之間。此處象山只是繪圖截斷位置，不宣稱是全線終點。 |
| [捷運工程局：松山線路線說明](https://www.dorts.gov.taipei/cp.aspx?n=71ACC5B0CDFFC313) | 西門→北門→中山→松江南京→南京復興→台北小巨蛋→南京三民→松山。正式名稱是「台北小巨蛋」，站號 G17；使用者提供的「小巨蛋站」以正式名稱呈現。 |
| [捷運工程局：小南門線路線說明](https://www.dorts.gov.taipei/cp.aspx?n=71ACC5B0CDFFC313&s=9A7448733F1518F5) | 西門→小南門→中正紀念堂，併入松山新店線。 |
| [捷運工程局：新店線路線說明](https://www.dorts.gov.taipei/cp.aspx?n=71ACC5B0CDFFC313&s=CBD13A8895C4EF94) | 中正紀念堂→古亭→台電大樓→公館；古亭 G09/O05。該頁表格的「中正紀年堂」筆誤不採用，交叉核對淡水線／信義線來源後使用「中正紀念堂」。 |
| [捷運工程局：南港線路線說明](https://www.dorts.gov.taipei/cp.aspx?n=5E61169F8C735065&s=8F1493D5192F9C06) | 板南線西門到昆陽的連續站序；後山埤 BL20 位於永春 BL19 與昆陽 BL21 之間。 |
| [捷運工程局：新莊線路線說明](https://www.dorts.gov.taipei/cp.aspx?n=122C012A85C41404&s=33245A586D747A2C) | 古亭→東門→忠孝新生→松江南京→行天宮→中山國小→民權西路→大橋頭，以及換乘關係。 |
| [捷運工程局：文山內湖線路線說明](https://www.dorts.gov.taipei/cp.aspx?n=DBAC040496EFAB94) | 科技大樓→大安→忠孝復興→南京復興→中山國中，以及沿途換乘關係。 |
| [臺北捷運公司：公開車站清單](https://www.metro.taipei/News_Content.aspx?n=320CF0D294FF9489&s=6F817AB5AC4A87D5&sms=EA56BA3CA296DDF6) | 補充交叉核對各線站名與營運代碼。此頁有部分車站未列，不單獨用來判定完整站序。 |

### 實際畫入的連續站序

同一站跨路線共用同一個節點。未發布站用灰色圓點，主要換乘站為雙圓；只有三個已發布站為彩色建築，後山埤為灰色預定站點。普通圓點的完整站名可在桌面滑鼠停留時由 title 讀取；圖面僅印主要站名。

- **R 淡水信義線**：圓山 → 民權西路 → 雙連 → 中山 → 台北車站 → 台大醫院 → 中正紀念堂 → 東門 → 大安森林公園 → 大安 → 信義安和 → 台北101/世貿 → 象山。
- **G 松山新店線**：公館 → 台電大樓 → 古亭 → 中正紀念堂 → 小南門 → 西門 → 北門 → 中山 → 松江南京 → 南京復興 → 台北小巨蛋 → 南京三民 → 松山。
- **BL 板南線**：西門 → 台北車站 → 善導寺 → 忠孝新生 → 忠孝復興 → 忠孝敦化 → 國父紀念館 → 市政府 → 永春 → 後山埤 → 昆陽。
- **O 中和新蘆線**：古亭 → 東門 → 忠孝新生 → 松江南京 → 行天宮 → 中山國小 → 民權西路 → 大橋頭。
- **BR 文湖線**：科技大樓 → 大安 → 忠孝復興 → 南京復興 → 中山國中。

## 店家資料匯入：2026/10/25 更新

目前 index.html 已以本資料夾 stations-data.json 的 stations 陣列替換虛構卡片；共19間店，使用者提供的19張JPEG原圖直接內嵌。來源資料為使用者委託 grokbot 整理後交付，本輪只核對本機JSON與呈現，未再次查核外站。舊版 stations-data-report.md 有較早的未決問題，以本次使用者明確規則及現行JSON為準。

- 價格、營業時間、公休日、出口步行、價格來源均逐字呈現；null 在實際呈現欄位顯示「未取得」。notes 的較新版價格不替代 price_text。
- 每店列 data_date；價格日期另由price_source明載日期擷取。只有張記的對應$100評論日期明載於notes，依該註記呈現2026-02-26，不混用另一品項日期。
- 推定值、起價、來源不一致及舊來源提示，完整逐項清單見 [data-audit.md](data-audit.md)。
- 小巨蛋4店，其他三站各5店。站點頁標題依series標「小巨蛋 第1站」「雙連 第3站」「東門 第4站」「後山埤 第5站」，明寫網站編號。地圖仍標「台北小巨蛋」。
- 後山埤為預定發布，links全null，不產生貼文連結；雙連無IG，只有Threads及小紅書。extra_stations不加入互動名單。
- 所有菜圖標「菜圖為 AI 示意，非店家實拍」，且各頁有「價格、營業時間可能調整，出發前再確認」。

## 社群連結

連結逐字取自JSON，null不顯示。個人頁追蹤及首頁留言入口沿用前版使用者授權入口，不自動發布或留言。

- **小巨蛋**：[ig](https://www.instagram.com/p/DewQqqNm7ay/) · [threads](https://www.threads.com/@savvysave_/post/DewQ7Zrm-DR)。
- **雙連**：[threads](https://www.threads.com/@savvysave_/post/De1zvmkG_ae) · [xhs](https://www.xiaohongshu.com/explore/6adb37d0000000003301e297)。
- **東門**：[ig](https://www.instagram.com/p/De3-727lsyD/) · [threads](https://www.threads.com/@savvysave_/post/De3_XpdFWGb) · [xhs](https://www.xiaohongshu.com/explore/6adc8a02000000002c027dce)。
- **後山埤**：無；預定發布。

## 字型、執行與驗證

Noto Sans TC、Fraunces 為 SIL Open Font License；沿用已下載的字型並依更新文字重新製作WOFF2子集，以data URI內嵌。Colorfigures MIT與字型OFL完整保留於HTML註解。

直接以瀏覽器開啟index.html，無需伺服器。字型、地圖及菜圖全內嵌，價格資料也已嵌入；瀏覽器不讀取旁邊JSON或照片。點擊社群連結才離開本頁。

本輪使用獨立headless Chrome，在斷網模式完成390px／1280px核對與截圖。完整結果見work/qa-real-results.json；新截圖位於screenshots/real-data/，原screenshots根目錄的舊範例圖僅留作歷史，不作本次交付證據。

修正桌面店卡被來源列擠窄的結構問題後重跑驗證。原始JSON、照片、輸入報告與iOS專案不修改；未部署、未上線、未新建PR。
