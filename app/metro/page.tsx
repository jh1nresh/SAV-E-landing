import { getFoodStations } from '../../lib/metro';
import { FOOD_DISCLAIMER } from '../../lib/metro-logic.mjs';
import { guideMetadata } from '../zh-tw/guides/content';
import '../zh-tw/guides/guides.css';
import './food.css';

export const metadata = guideMetadata('捷運美食清單｜Savvy', '從一站出發，閱讀台北捷運美食筆記與來源；營業時間、價格請在出發前再確認。', '/metro');
export default function MetroFoodPage() {
  return <main className="guide-shell metro-food" lang="zh-Hant">
    <a className="guide-back" href="/">← 回到首頁</a>
    <header className="guide-header">
      <p className="guide-eyebrow">SAVVY · TAIPEI FOOD NOTES</p>
      <h1 className="guide-title">捷運美食清單</h1>
      <p className="guide-lead">從一站出發，把想吃的小店收進口袋。</p>
      <p className="guide-small">{FOOD_DISCLAIMER}</p>
    </header>
    <div className="guide-grid">
      {getFoodStations().map(s => <a className="guide-card" href={`/metro/${s.slug}`} key={s.n}>
        {s.images.slides[0] && <img className="food-cover" src={s.images.slides[0]} alt={`${s.station}美食清單封面`} width={1080} height={1350} loading="lazy" />}
        <span className="guide-number">{String(s.n).padStart(2, '0')}</span>
        <h2>{s.station}</h2>
        {s.tagline && <p>{s.tagline}</p>}
        <span className="guide-read">看這一站 →</span>
      </a>)}
    </div>
  </main>;
}
