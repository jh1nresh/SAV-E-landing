# GitHub App（metro inbox 無人值守）

創辦人設定。目的：讓 **Metro GTM inbox sync** 用 App 身分推分支、開／更新內容 PR，後續 CI 才會自動跑，不必等人按 “Approve workflows”。

詳細逐步操作見既有說明（places bot 同源流程）：`/workspace/shared/eng/2026-10-27-landing-github-app-guide.md`（或問 Eng 要一份）。重點如下：

## 要做的事

1. 建一個**只裝在** `jh1nresh/SAV-E-landing` 的 GitHub App（建議名 `savvy-landing-metro-inbox`；若 places bot 已存在且權限足夠，可共用）。
2. Repository permissions：
   - **Contents**: Read and write（推 `content/metro-inbox/*` 分支）
   - **Pull requests**: Read and write
   - **Issues**: Read and write（缺座標等阻擋時開／更新同一則 issue）
   - **Metadata**: Read-only
   - **不要**給 Workflows / Administration / Secrets
3. 產生私鑰，放到 repo Secret：`APP_PRIVATE_KEY`（整份 PEM，不要貼到聊天）。
4. 把 App ID 放到 repo Variable：`APP_ID`。
5. 跟 Eng 說「App 建好了」。

## 為什麼不能只用 `GITHUB_TOKEN`

用內建 `GITHUB_TOKEN` 開出的 PR，後續 workflow 常要人工核准，會打断「完全不用 agent／人工」的日常內容流。官方建議改用 GitHub App installation token。

## Eng 不會做的事

Eng **不會**代建 App、不會代填 Secret、不會發明憑證。本 PR 的 workflow 在 Secret 缺失時會警告並退回 `GITHUB_TOKEN`（可能卡住 CI 核准）。
