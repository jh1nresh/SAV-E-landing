import { POSTS_ROOT, postDate, postMetadata, postPath, sourceOnlyPosts, threadPosts } from "./content";
import "../guides/guides.css";

export const metadata = postMetadata("城市貼文", "按地區和城市瀏覽 Savvy 在 Threads 發布的美食清單和散步筆記。", POSTS_ROOT);

export default function PostsIndex() {
  const destinations = [...new Set(threadPosts.map((post) => post.region + " · " + post.city))];
  return (
    <main className="guide-shell" lang="zh-Hant">
      <a href="/" className="guide-back">← 回到 Savvy</a>
      <header className="guide-header">
        <h1 className="guide-title">城市貼文</h1>
        <p className="guide-small">@savvysave_ · {threadPosts.length + sourceOnlyPosts.length} 則</p>
      </header>
      {destinations.length ? (
        <nav className="guide-toc" aria-label="按目的地瀏覽">
          <ul>{destinations.map((name, index) => (
            <li key={name}><a href={`#destination-${index + 1}`}>{name}</a></li>
          ))}</ul>
        </nav>
      ) : <p>城市貼文整理中。</p>}
      {sourceOnlyPosts.length > 0 && <section className="guide-section">
        <h2>捷運攻略的 Threads 原文</h2>
        <ul>{sourceOnlyPosts.map(post => <li key={post.code}>
          <a href={post.href}>{post.title}</a>{" · "}<a href={post.url}>Threads 原文</a>
        </li>)}</ul>
      </section>}
      {destinations.map((name, index) => (
        <section className="guide-section" id={`destination-${index + 1}`} key={name}>
          <h2>{name}</h2>
          <ul>
            {threadPosts.filter((post) => post.region + " · " + post.city === name).map((post) => (
              <li key={post.code}>
                <a href={postPath(post)}>{post.title}</a>{" "}
                <a href={post.url} className="guide-small">Threads 原文</a>{" · "}
                <time className="guide-small" dateTime={post.date}>{postDate(post.date)}</time>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
