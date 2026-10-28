import { notFound } from "next/navigation";
import { TESTFLIGHT_URL } from "../../../site";
import { GUIDE_ROOT, guideMetadata, guidePath, guides } from "../content";
import "../guides.css";

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() {
  return guides.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const guide = guides.find((entry) => entry.slug === slug);
  if (!guide) notFound();
  return guideMetadata(guide.title, guide.description, guidePath(slug));
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = guides.find((entry) => entry.slug === slug);
  if (!guide) notFound();
  return (
    <main className="guide-shell guide-article" lang="zh-Hant">
      <a className="guide-back" href={GUIDE_ROOT}>← 收藏整理指南</a>
      <article>
        <header className="guide-header">
          <p className="guide-eyebrow">SAVVY FIELD NOTES</p>
          <h1 className="guide-title">{guide.title.replace(/｜Savvy$/, "")}</h1>
          <p className="guide-lead">{guide.description}</p>
          <p className="guide-small">內容核對：<time dateTime={guide.updatedAt}>{guide.updatedAt}</time> · iOS 測試版操作參考</p>
          <p className="guide-version">各項入口可能依測試版本而異。若你的版本沒有文中功能，先<a href="/support">查看支援資訊</a>；不要為了套用步驟而分享完整私人資料。</p>
        </header>
        <nav className="guide-toc" aria-label="本篇目錄">
          <p>這篇可以幫你</p>
          <ol>{guide.sections.map((section, index) => <li key={section.heading}><a href={`#step-${index}`}>{section.heading}</a></li>)}</ol>
        </nav>
        {guide.sections.map((section, index) => (
          <section className="guide-section" id={`step-${index}`} key={section.heading}>
            <h2>{section.heading}</h2>
            {section.blocks.map((block, blockIndex) => {
              const key = `${index}-${blockIndex}`;
              if (block.type === "steps" && "items" in block) return <ol key={key}>{block.items?.map((item) => <li key={item}>{item}</li>)}</ol>;
              if (block.type === "question" && "text" in block) return <h3 key={key}>{block.text}</h3>;
              if (block.type === "table" && "rows" in block) return <table key={key}><caption>匯入資料與支援範圍</caption><thead><tr>{block.rows?.[0].map((cell) => <th scope="col" key={cell}>{cell}</th>)}</tr></thead><tbody>{block.rows?.slice(1).map((row) => <tr key={row[0]}><th scope="row">{row[0]}</th><td>{row[1]}</td></tr>)}</tbody></table>;
              return <p key={key}>{"text" in block ? block.text : ""}</p>;
            })}
          </section>
        ))}
        <aside className="guide-next" aria-label="下一步">
          <h2>從一個小步驟開始</h2>
          <p>準備好自己的來源連結或地點資料，再在裝置上確認 Savvy 的測試版本與可用功能。</p>
          <a className="guide-button" href={TESTFLIGHT_URL} target="_blank" rel="noopener noreferrer">查看 Savvy TestFlight 測試版 ↗</a>
          <p className="guide-small">前往 Apple 的測試邀請頁；名額、相容裝置及版本以該頁為準。這不是 App Store 正式下載。</p>
        </aside>
      </article>
      <nav className="guide-related" aria-label="延伸閱讀">
        <h2>接著整理下一步</h2>
        {guides.filter((entry) => entry.slug !== slug).map((entry) => <a key={entry.slug} href={guidePath(entry.slug)}>{entry.label} →</a>)}
        <a href="/">回到捷運美食地圖 →</a>
      </nav>
    </main>
  );
}
