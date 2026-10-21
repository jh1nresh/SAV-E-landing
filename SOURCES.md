# Savvy website v6（doodle v1 board 窄長畫面版）
Ported into this Next.js app (routes `/`, `/privacy`, `/support`). Founder approved 14:54.
來源：/workspace/uploads/orig-design-zip/ 的 board。腳本 work/boards.py。
所有手機：螢幕 396×820（0.483），外框 424×848（0.5），同一種外框。
| 段 | 手機 | 來源 board 欄 | 補邊 |
|---|---|---|---|
| 1 | home | light-main 第 1 欄 | 上下各補約 24px 背景色 |
| 1 | capture | light-flows 第 2 欄 | 無 |
| 2 | passport | light-main 第 4 欄 | 上下補背景色 |
| 3 | map | light-main 第 2 欄 | 上下補背景色 |
| 3 | friends | light-main 第 3 欄 | 上下補背景色 |
| 4 | dark home | dark-main 第 1 欄 | 上下補背景色 |
| 4 | paywall | light-flows 第 3 欄（Price unavailable） | 無 |
只去掉 board 畫面外圍 2–3px 的灰色描邊，內容不裁不拉伸；中英文頁共用英文畫面。
