import { notFound } from "next/navigation";
import { TRAVEL_ROOT, travelGuides, travelMetadata, travelPath } from "../content";
import { SITE_ORIGIN } from "../../../../lib/site-content";
import { safeJsonLd } from "../../../../lib/metro-guide.mjs";
import "../../guides/guides.css";

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() {
  return travelGuides.map(({ slug }) => ({ slug }));
}

async function findGuide({ params }: Props) {
  const { slug } = await params;
  const guide = travelGuides.find((entry) => entry.slug === slug);
  if (!guide) notFound();
  return guide;
}

export async function generateMetadata(props: Props) {
  const guide = await findGuide(props);
  return travelMetadata(guide.title, guide.description, travelPath(guide.slug));
}

export default async function TravelGuidePage(props: Props) {
  const guide = await findGuide(props);
  const canonical = SITE_ORIGIN + travelPath(guide.slug);
  const schema = {
    "@context": "https://schema.org", "@type": "Article",
    headline: guide.title, description: guide.description, url: canonical, mainEntityOfPage: canonical,
    inLanguage: "zh-Hant",
    author: { "@type": "Organization", name: "Savvy", url: SITE_ORIGIN },
  };
  return (
    <main className="guide-shell guide-article" lang="zh-Hant">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
      <a className="guide-back" href={TRAVEL_ROOT}>← 旅行攻略</a>
      <article>
        <header className="guide-header">
          <p className="guide-eyebrow">{guide.region} · {guide.city}</p>
          <h1 className="guide-title">{guide.title}</h1>
          <p className="guide-lead">{guide.description}</p>
          <p className="guide-small">Savvy · 資料整理於 <time dateTime={guide.date}>{guide.date}</time></p>
        </header>
        <nav className="guide-toc" aria-label="文章目錄">
          <ol>{guide.sections.map((section, index) => (
            <li key={section.heading}><a href={`#section-${index + 1}`}>{section.heading}</a></li>
          ))}</ol>
        </nav>
        {guide.sections.map(({ heading, paragraphs, table }, index) => (
          <section className="guide-section" id={`section-${index + 1}`} key={heading}>
            <h2>{heading}</h2>
            {paragraphs.map(({ text, links }) => (
              <p key={text}>
                {text}
                {links?.map(({ label, href }) => <span key={href}> <a href={href}>{label}</a></span>)}
              </p>
            ))}
            {table && (
              <div className="guide-table-scroll" role="region" aria-labelledby={`table-caption-${index}`} tabIndex={0}>
                <table>
                  <caption id={`table-caption-${index}`}>{table.caption}</caption>
                  <thead><tr>{table.columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
                  <tbody>{table.rows.map(([name, ...cells]) => (
                  <tr key={[name, ...cells].join("|")}><th scope="row">{name}</th>{cells.map((cell, i) => <td key={i}>{cell}</td>)}</tr>
                ))}</tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </article>
      <nav className="guide-related" aria-label="更多旅行攻略"><a href={TRAVEL_ROOT}>所有旅行攻略 →</a></nav>
    </main>
  );
}
