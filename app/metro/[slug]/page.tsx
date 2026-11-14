import { notFound } from 'next/navigation';
import { getFoodStations, getShanghaiFoodStations } from '../../../lib/metro';
import { FOOD_DISCLAIMER, foodShopRows } from '../../../lib/metro-logic.mjs';
import { guideMetadata } from '../../zh-tw/guides/content';
import '../../zh-tw/guides/guides.css';
import '../food.css';

export const dynamicParams = false;
const stations = [...getFoodStations(), ...getShanghaiFoodStations()];
export function generateStaticParams() { return stations.map(s => ({ slug: s.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const station = stations.find(s => s.slug === slug);
  if (!station) notFound();
  return guideMetadata(`${station.station}站美食清單｜Savvy`, station.tagline || FOOD_DISCLAIMER, `/metro/${station.slug}`);
}
export default async function StationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const station = stations.find(s => s.slug === slug);
  if (!station) notFound();
  const shanghai = station.city === 'shanghai';
  return <main className="guide-shell metro-food" lang="zh-Hant">
    <a className="guide-back" href={shanghai ? '/?city=shanghai' : '/metro'}>{shanghai ? '← 回到上海地圖' : '← 全部捷運美食清單'}</a>
    <header className="guide-header">
      <p className="guide-eyebrow">第 {station.n} 站 · {station.date}</p>
      <h1 className="guide-title">{station.station}</h1>
      {station.tagline && <p className="guide-lead">{station.tagline}</p>}
      <p className="guide-small">{FOOD_DISCLAIMER}</p>
      <div className="food-posts">{(['instagram', 'threads', 'xiaohongshu'] as const).map(platform => station.posts[platform] &&
        <a key={platform} href={station.posts[platform]!} target="_blank" rel="noopener noreferrer">{platform === 'instagram' ? 'Instagram' : platform === 'threads' ? 'Threads' : '小紅書'} ↗</a>)}</div>
    </header>
    <div className="guide-grid food-shops">{station.shops.map((shop, index) => <article className="guide-card" key={shop.key ?? index}>
      {shop.name && <h2>{shop.name}</h2>}
      <dl>{foodShopRows(shop, station.city).map(([label, value]) => <div className="food-row" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </article>)}</div>
    {station.images.photos.length > 0 && <section aria-label="美食照片" className="food-gallery">{station.images.photos.map(src =>
      <img key={src} src={src} alt={`${station.station}美食照片`} width={800} height={600} loading="lazy" />)}</section>}
  </main>;
}
