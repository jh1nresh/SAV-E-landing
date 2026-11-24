import { TRAVEL_ROOT, travelGuides, travelMetadata, travelPath } from "./content";
import "../guides/guides.css";

export const metadata = travelMetadata("旅行攻略", "查找目的地的住宿選區、票券比較與半日散步路線。", TRAVEL_ROOT);

export default function TravelIndex() {
  return (
    <main className="guide-shell" lang="zh-Hant">
      <a className="guide-back" href="/">← 回到 Savvy</a>
      <header className="guide-header"><h1 className="guide-title">旅行攻略</h1></header>
      {travelGuides.length ? (
        <div className="guide-grid">
          {travelGuides.map((guide) => (
            <a className="guide-card" key={guide.slug} href={travelPath(guide.slug)}>
              <span className="guide-small">{guide.region} · {guide.city}</span>
              <h2>{guide.title}</h2>
              <p>{guide.description}</p>
              <span className="guide-read">閱讀攻略 →</span>
            </a>
          ))}
        </div>
      ) : <p>旅行攻略整理中。</p>}
    </main>
  );
}
