import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getFoodStations, getShanghaiFoodStations } from '../../../lib/metro';
import { FOOD_DISCLAIMER, foodShopRows } from '../../../lib/metro-logic.mjs';
import { guideMetadata } from '../../zh-tw/guides/content';
import { SITE_ORIGIN } from '../../../lib/site-content';
import { guideCityName, guideDescription, guideHeading, guideStationName, guideStructuredData, guideTitle, guideUpdatedAt, safeJsonLd, shopAnchor, shopMapLink, shopPhoto } from '../../../lib/metro-guide.mjs';
import '../../zh-tw/guides/guides.css';
import '../food.css';

export const dynamicParams = false;
const stations = [...getFoodStations(), ...getShanghaiFoodStations()];
export function generateStaticParams() { return stations.map(s => ({ slug: s.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const station = stations.find(s => s.slug === slug);
  if (!station) notFound();
  const metadata = guideMetadata(guideTitle(station), guideDescription(station), `/metro/${station.slug}`);
  const photo = shopPhoto(station, station.shops[0]);
  return { ...metadata,
    openGraph: { ...metadata.openGraph, type: 'article', publishedTime: station.date, modifiedTime: guideUpdatedAt(station), ...(photo ? { images: [{ url: photo, alt: `${guideStationName(station)}美食：${station.shops[0].name}` }] } : {}) },
    twitter: { ...metadata.twitter, ...(photo ? { images: [photo] } : {}) },
  };
}
export default async function StationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const station = stations.find(s => s.slug === slug);
  if (!station) notFound();
  const shanghai = station.city === 'shanghai';
  return <main className="guide-shell metro-food" lang="zh-Hant">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(guideStructuredData(station, SITE_ORIGIN)) }} />
    <a className="guide-back" href={shanghai ? '/?city=shanghai' : '/metro'}>{shanghai ? '← 回到上海地圖' : '← 全部捷運美食清單'}</a>
    <nav className="food-breadcrumbs" aria-label="目前位置"><a href="/">Savvy</a><span aria-hidden="true">／</span><a href="/metro">捷運美食攻略</a><span aria-hidden="true">／</span><span aria-current="page">{guideHeading(station)}</span></nav>
    <header className="guide-header">
      <p className="guide-eyebrow">{guideCityName(station)} · 第 {station.n} 站 · {shanghai ? '價格以人民幣標示' : '價格以新台幣標示'}</p>
      <h1 className="guide-title">{guideHeading(station)}</h1>
      {station.tagline && <p className="guide-lead">{station.tagline}</p>}
      <p className="food-intro">{guideDescription(station)}</p>
      <p className="guide-small">原始筆記 <time dateTime={station.date}>{station.date}</time> · 頁面更新 <time dateTime={guideUpdatedAt(station)}>{guideUpdatedAt(station)}</time></p>
      <p className="guide-small">{FOOD_DISCLAIMER}</p>
      <div className="food-posts">{(['instagram', 'threads', 'xiaohongshu'] as const).map(platform => station.posts[platform] &&
        <a key={platform} href={station.posts[platform]!} target="_blank" rel="noopener noreferrer">{platform === 'instagram' ? 'Instagram' : platform === 'threads' ? 'Threads' : '小紅書'} ↗</a>)}</div>
    </header>
    <nav className="food-quick-index" aria-label="本篇店家快速索引">
      <h2>先選想吃的</h2>
      <ol>{station.shops.map((shop, index) => <li key={shop.key ?? index}><a href={`#${shopAnchor(shop, index)}`}><span>{String(index + 1).padStart(2, '0')}</span><strong>{shop.name}</strong>{shop.dish && <small>{shop.dish}</small>}</a></li>)}</ol>
    </nav>
    <div className="guide-grid food-shops">{station.shops.map((shop, index) => {
      const photo = shopPhoto(station, shop);
      const map = shopMapLink(station, shop);
      return <article className="guide-card" id={shopAnchor(shop, index)} tabIndex={-1} key={shop.key ?? index}>
      {photo && <figure className="food-shop-photo"><img src={photo} alt={`${shop.name}：${shop.dish || guideStationName(station) + '美食'}`} width={800} height={600} loading="lazy" /><figcaption>{shop.name}</figcaption></figure>}
      {shop.name && <h2>{shop.name}</h2>}
      <dl>{foodShopRows(shop, station.city).map(([label, value]) => <div className="food-row" key={label}><dt>{label}</dt><dd>{sourceText(value)}</dd></div>)}</dl>
      <a className="food-map-link" href={map.href} target="_blank" rel="noopener noreferrer" aria-label={`在${map.label}查看${shop.name}`}>{map.label} ↗</a>
    </article>})}</div>
    <section className="food-before-going" aria-labelledby="before-going"><h2 id="before-going">出發前確認</h2><p>標示外送價的品項不等於店內價，舊菜單或食記價格也不代表今天售價。「查詢」日期是讀取公開頁的時間，並非店家更新日期；暫停供應、堂食與窗口限制請看各店說明。</p><p>地圖連結依店名與地址搜尋；步行時間與距離採來源估計，有些路線從其他鄰近車站起算。選定分店後，再確認當日營業時間、路線與是否需要預約。</p></section>
  </main>;
}

function sourceText(value: string) {
  return value.split(/(https?:\/\/[^\s]+)/).map((part, index) => /^https?:\/\//.test(part)
    ? <a key={index} href={part.replace(/[。，；、）]+$/u, '')} target="_blank" rel="noopener noreferrer">{part}</a>
    : part);
}
