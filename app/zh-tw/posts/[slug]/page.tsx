import { notFound } from "next/navigation";
import { POSTS_ROOT, postDate, postMetadata, postPath, stationThreads, threadPosts } from "../content";
import { SITE_ORIGIN } from "../../../../lib/site-content";
import { safeJsonLd } from "../../../../lib/metro-guide.mjs";
import "../../guides/guides.css";

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;

export function generateStaticParams() {
  return threadPosts.map(({ slug }) => ({ slug }));
}

async function getPost({ params }: Props) {
  const { slug } = await params;
  const post = threadPosts.find((item) => item.slug === slug);
  if (!post) notFound();
  return post;
}

export async function generateMetadata(props: Props) {
  const post = await getPost(props);
  return postMetadata(post.title, post.text.replace(/\s+/g, " ").trim().slice(0, 145), postPath(post));
}

export default async function PostPage(props: Props) {
  const post = await getPost(props);
  const canonical = SITE_ORIGIN + postPath(post);
  const related = stationThreads.find(item => item.code === post.code);
  const schema = {
    "@context": "https://schema.org", "@type": "Article",
    headline: post.title, datePublished: post.date, url: canonical, mainEntityOfPage: canonical,
    inLanguage: "zh-Hant", isBasedOn: post.url,
    author: { "@type": "Organization", name: "Savvy", url: SITE_ORIGIN },
  };
  const firstLine = post.text.split("\n", 1)[0];
  const titleInBody = firstLine.replace(/^[《【]|[】》]$/g, "") === post.title;
  const body = titleInBody ? post.text.slice(firstLine.length).trimStart() : post.text;
  return (
    <main className="guide-shell guide-article" lang="zh-Hant">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
      <a className="guide-back" href={POSTS_ROOT}>← 城市貼文</a>
      <article>
        <header className="guide-header">
          <p className="guide-eyebrow">{post.region} · {post.city}</p>
          <h1 className="guide-title">{titleInBody ? firstLine : post.title}</h1>
          <p className="guide-small">
            @savvysave_ · <time dateTime={post.date}>{postDate(post.date)}</time>
          </p>
          {post.publishedExcerpt && <p className="guide-small">節錄，兩筆評論價格請見 Threads 原文。</p>}
        </header>
        <div className="guide-section">
          {body.split(/\n\n/).map((paragraph, index) => (
            <p key={index} style={{ whiteSpace: "pre-line", overflowWrap: "anywhere" }}>{paragraph}</p>
          ))}
        </div>
      </article>
      <nav className="guide-related" aria-label="原始貼文">
        {related && <a href={related.href}>看{related.title}</a>}
        <a href={post.url}>在 Threads 查看原文與圖片 ↗</a>
      </nav>
    </main>
  );
}
