import { GUIDE_ROOT, guideMetadata, guidePath, guides } from "./content";
import "./guides.css";

export const metadata = guideMetadata(
  "收藏整理指南：從餐廳貼文到自己的地圖｜Savvy",
  "從 IG 餐廳貼文、Google Maps 收藏和已確認地點開始，學會保留來源、核對位置，再安排一個可調整的出遊草稿。",
  GUIDE_ROOT,
);

export default function GuidesIndex() {
  return (
    <main className="guide-shell" lang="zh-Hant">
      <a className="guide-back" href="/">← 回到捷運美食地圖</a>
      <header className="guide-header">
        <p className="guide-eyebrow">SAVVY FIELD NOTES · 收藏整理指南</p>
        <h1 className="guide-title">把想去的地方，<br />一步步整理回來。</h1>
        <p className="guide-lead">先留下來源，再確認地點。從你手上的一則貼文或一份收藏開始。</p>
      </header>
      <div className="guide-grid">
        {guides.map((guide, index) => (
          <a className="guide-card" href={guidePath(guide.slug)} key={guide.slug}>
            <span className="guide-number">0{index + 1}</span>
            <h2>{guide.label}</h2>
            <p>{guide.description}</p>
            <span className="guide-read">閱讀指南 →</span>
          </a>
        ))}
      </div>
      <p className="guide-small">指南目前提供繁體中文。示例均清楚標示；不需要在網站上傳私人收藏或 Takeout 檔案。</p>
    </main>
  );
}
