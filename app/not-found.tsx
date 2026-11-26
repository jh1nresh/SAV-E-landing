import "./zh-tw/guides/guides.css";

export default function NotFound() {
  return (
    <main className="guide-shell" lang="zh-Hant">
      <header className="guide-header">
        <h1 className="guide-title">找不到這個頁面</h1>
        <p className="guide-lead">這個連結可能已經變更。</p>
      </header>
      <a className="guide-button" href="/">回到 Savvy 首頁 →</a>
    </main>
  );
}
