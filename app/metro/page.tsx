import { getFoodStations, getShanghaiFoodStations } from '../../lib/metro';
import { FOOD_DISCLAIMER } from '../../lib/metro-logic.mjs';
import { guideStationName } from '../../lib/metro-guide.mjs';
import { guideMetadata } from '../zh-tw/guides/content';
import '../zh-tw/guides/guides.css';
import './food.css';

export const metadata = guideMetadata('台北、上海捷運美食攻略｜按站找餐廳與小吃｜Savvy', '從台北捷運或上海地鐵選一站，查看周邊餐廳、推薦餐點、參考價格、地址與資料來源，搭配地圖安排下一餐。', '/metro');
export default function MetroFoodPage() {
  return <main className="guide-shell metro-food" lang="zh-Hant">
    <a className="guide-back" href="/">← 回到首頁</a>
    <header className="guide-header">
      <p className="guide-eyebrow">SAVVY · METRO FOOD GUIDES</p>
      <h1 className="guide-title">台北、上海捷運美食攻略</h1>
      <p className="guide-lead">先選一站，再看餐點、參考價格和店家位置。</p>
      <p className="guide-small">{FOOD_DISCLAIMER}</p>
      <nav className="food-city-index" aria-label="依城市找美食"><a href="#taipei">台北捷運</a><a href="#shanghai">上海地鐵</a></nav>
    </header>
    {[{ id: 'taipei', label: '台北捷運美食', stations: getFoodStations() }, { id: 'shanghai', label: '上海地鐵美食', stations: getShanghaiFoodStations() }].map(city => <section className="food-city-section" id={city.id} key={city.id} aria-labelledby={`${city.id}-title`}>
      <h2 id={`${city.id}-title`}>{city.label}</h2><p>{city.stations.length} 站，按站名查看完整攻略。</p>
      <div className="guide-grid">{city.stations.map(s => <a className="guide-card" href={`/metro/${s.slug}`} key={s.slug}>
          {s.images.slides[0] && <img className="food-cover" src={s.images.slides[0]} alt={`${s.station}美食攻略封面`} width={1080} height={1350} loading="lazy" />}
          <span className="guide-number">{String(s.n).padStart(2, '0')}</span>
          <h3>{guideStationName(s)}</h3>{s.tagline && <p>{s.tagline}</p>}
          <span className="guide-read">看這一站的攻略 →</span>
        </a>)}</div>
    </section>)}
  </main>;
}
