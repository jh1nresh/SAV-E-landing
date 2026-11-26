import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getFoodStations, getShanghaiFoodStations } from '../../../lib/metro';
import { FOOD_DISCLAIMER, foodShopRows } from '../../../lib/metro-logic.mjs';
import { relatedStations, shuanglianComparison, shuanglianComparisonHeaders, shuanglianFaq, shuanglianPlans, shuanglianTips, stationEditorial, stationLines, stationRelatedLabel } from '../../../lib/metro-editorial';
import { guideMetadata } from '../../zh-tw/guides/content';
import { TESTFLIGHT_URL } from '../../site';
import { SITE_ORIGIN } from '../../../lib/site-content';
import { shopSearchHref, guideCityName, guideDescription, guideHeading, guideStationName, guideStructuredData, guideTitle, guideUpdatedAt, safeJsonLd, shopAnchor, shopMapLink, shopPhoto } from '../../../lib/metro-guide.mjs';
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
  const shuanglian = station.slug === 'shuanglian';
  const lines = stationLines(station);
  const moreStations = relatedStations(station, stations);
  return <main className="guide-shell metro-food" lang="zh-Hant">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(guideStructuredData(station, SITE_ORIGIN, shuanglian ? shuanglianFaq : undefined)) }} />
    <a className="guide-back" href={shanghai ? '/discover?city=shanghai' : '/metro'}>{shanghai ? '← 回到上海地圖' : '← 全部捷運美食清單'}</a>
    <nav className="food-breadcrumbs" aria-label="目前位置"><a href="/">Savvy</a><span aria-hidden="true">／</span><a href="/metro">捷運美食攻略</a><span aria-hidden="true">／</span><span aria-current="page">{guideHeading(station)}</span></nav>
    <header className="guide-header">
      <p className="guide-eyebrow">{[guideCityName(station), ...lines, shanghai ? '價格以人民幣標示' : '價格以新台幣標示'].join(' · ')}</p>
      <h1 className="guide-title">{guideHeading(station)}</h1>
      <p className="guide-lead food-intro">{stationEditorial(station).intro}</p>
      <p className="guide-small">原始筆記 <time dateTime={station.date}>{station.date}</time> · 頁面更新 <time dateTime={guideUpdatedAt(station)}>{guideUpdatedAt(station)}</time></p>
      <p className="guide-small">{FOOD_DISCLAIMER}</p>
      <div className="food-posts">{(['instagram', 'threads', 'xiaohongshu'] as const).map(platform => station.posts[platform] &&
        <a key={platform} href={station.posts[platform]!} target="_blank" rel="noopener noreferrer">{platform === 'instagram' ? 'Instagram' : platform === 'threads' ? 'Threads' : '小紅書'} ↗</a>)}</div>
    </header>
    {shuanglian && <section className="food-comparison guide-section food-quick-index" aria-labelledby="food-comparison-heading">
      <h2 id="food-comparison-heading">5 家店怎麼選</h2>
      <p className="food-table-hint guide-small" id="food-table-hint">左右滑動，看週末營業與捷運出口。</p>
      <div className="guide-table-scroll" role="region" aria-labelledby="food-comparison-caption" aria-describedby="food-table-hint" tabIndex={0}>
        <table>
          <caption id="food-comparison-caption">雙連站小吃與甜點速查</caption>
          <thead><tr>{shuanglianComparisonHeaders.map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
          <tbody>{shuanglianComparison(station).map(({ name, anchor, cells }) => <tr key={anchor}>
            <th scope="row"><a href={`#${anchor}`}>{name}</a></th>
            {cells.map((value, index) => <td key={shuanglianComparisonHeaders[index + 1]}>{value}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
      <p className="guide-small">外送和歷史菜單價格供參考，店內價格及假日時間以店家公告為準。</p>
    </section>}
    {shuanglian && <section className="food-plan" aria-labelledby="food-plan-heading">
      <h2 id="food-plan-heading">平日和週末怎麼吃</h2>
      <ul>{shuanglianPlans.map(({ when, parts }) => <li key={when}><strong>{when}</strong>{' '}
        {parts.map(part => typeof part === 'string' ? part : <a key={part.anchor} href={`#${part.anchor}`}>{part.name}</a>)}
      </li>)}</ul>
    </section>}
    {!shuanglian && <nav className="food-quick-index" aria-label="本篇店家快速索引">
      <h2>先選想吃的</h2>
      <ol>{station.shops.map((shop, index) => <li key={shop.key ?? index}><a href={`#${shopAnchor(shop, index)}`}><span>{String(index + 1).padStart(2, '0')}</span><strong>{shop.name}</strong>{shop.dish && <small>{shop.dish}</small>}</a></li>)}</ol>
    </nav>}
    <div className="guide-grid food-shops">{station.shops.map((shop, index) => {
      const photo = shopPhoto(station, shop);
      const map = shopMapLink(station, shop);
      const rows = foodShopRows(shop, station.city);
      const tip = shuanglian && shop.key ? shuanglianTips[shop.key] : undefined;
      const hours = shop.hours?.split(/；(?=來源未標更新日|20\d{2}-\d{2}-\d{2}\s*(?:查詢|記錄|核對))/u)[0];
      const hasHoursRecord = Boolean(shop.hours && hours !== shop.hours);
      const records = rows.filter(([label]) => label === '價格出處' || (label === '營業時間' && hasHoursRecord));
      return <article className="guide-card" id={shopAnchor(shop, index)} tabIndex={-1} key={shop.key ?? index}>
      {photo && <figure className="food-shop-photo"><img src={photo} alt={`${shop.name}：${shop.dish || guideStationName(station) + '美食'}`} width={800} height={600} loading="lazy" /><figcaption>{shop.name}</figcaption></figure>}
      {shop.name && <h2>{shop.name}</h2>}
      {tip && <><span className="food-tag">{tip.tag}</span><p className="food-shop-note">{tip.note}</p></>}
      <dl>{rows.filter(([label]) => label !== '價格出處').map(([label, value]) => <div className="food-row" key={label}>
        <dt>{label === '營業時間' && hasHoursRecord ? '營業速覽' : label}</dt>
        <dd>{sourceText(label === '營業時間' && hours ? hours : value)}</dd>
      </div>)}</dl>
      {shop.price && !shop.price.includes('外送') && /外送平台價格|外送表|非店內價/.test(shop.price_source ?? '') &&
        <p className="guide-small">外送參考價，店內價格請以現場為準。</p>}
      <div className="food-map-actions">
        <a className="food-search-link" href={shopSearchHref(station, shop)} target="_blank" rel="noopener noreferrer" aria-label={`在 Google Maps 搜尋${shop.name}`}>Google Maps ↗</a>
        <a className="food-map-link" href={map.href} target="_blank" rel="noopener noreferrer" aria-label={`在${map.label}查看${shop.name}`}>{map.label} ↗</a>
      </div>
      {(records.length > 0 || tip?.source) && <details className="food-sources">
        <summary>資料來源與查核紀錄</summary>
        {records.length > 0 && <dl>{records.map(([label, value]) => <div className="food-row" key={label}><dt>{label}</dt><dd>{sourceText(value)}</dd></div>)}</dl>}
        {tip?.source && <p><a href={tip.source} target="_blank" rel="noopener noreferrer">店家或商圈公告 ↗</a></p>}
      </details>}
    </article>})}</div>
    {shuanglian && <section className="guide-section" id="faq" aria-labelledby="food-faq-heading">
      <h2 id="food-faq-heading">常見問題</h2>
      {shuanglianFaq.map(({ question, answer }) => <div key={question}>
        <h3>{question}</h3><p>{answer}</p>
      </div>)}
    </section>}
    <section className="food-plan" aria-labelledby="food-save-heading">
      <h2 id="food-save-heading">把想吃的店留到下次</h2>
      <p>在地圖確認分店後，從 iPhone 分享店家連結給 Savvy，或複製到 App。核對地點再存進自己的地圖，想去時就找得到。</p>
      <div className="food-map-actions"><a className="guide-button" href="/#app">查看 Savvy App 測試名單 →</a><a href="/zh-tw/guides/plan-from-saved-places">怎麼整理想去的清單 →</a></div>
      {shuanglian && <div className="food-map-actions">
        <a className="food-search-link" href={TESTFLIGHT_URL}>查看 iOS TestFlight 測試版 ↗</a>
        <a className="food-search-link" href="/zh-tw/guides/instagram-restaurants-to-map">把 IG 收藏整理成地圖 →</a>
      </div>}
    </section>
    {moreStations.length > 0 && <nav className="food-before-going guide-related" aria-label="同線延伸推薦"><h2>同條線還能去哪吃</h2>
      {moreStations.map(other => <a key={other.slug} href={`/metro/${other.slug}`}>{stationRelatedLabel(other)} →</a>)}
      {shuanglian && <a href="/metro#taipei">查看全部台北捷運美食 →</a>}
    </nav>}
    <details className="food-before-going food-sources"><summary>出發前確認</summary><p>標示外送價的品項不等於店內價，舊菜單或食記價格也不代表今天售價。「查詢」日期是讀取公開頁的時間，並非店家更新日期；暫停供應、堂食與窗口限制請看各店說明。</p><p>地圖連結依店名與地址搜尋；步行時間與距離採來源估計，有些路線從其他鄰近車站起算。選定分店後，再確認當日營業時間、路線與是否需要預約。</p></details>
  </main>;
}

function sourceText(value: string) {
  return value.split(/(https?:\/\/[^\s]+)/).map((part, index) => {
    if (!/^https?:\/\//.test(part)) return part;
    const url = part.replace(/[。，；、）]+$/u, '');
    return <span key={index}><a href={url} target="_blank" rel="noopener noreferrer">查看來源 ↗</a>{part.slice(url.length)}</span>;
  });
}
