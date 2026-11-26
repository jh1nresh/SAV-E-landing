import { getFoodStations, getShanghaiFoodStations } from '../../lib/metro';
import { FOOD_DISCLAIMER } from '../../lib/metro-logic.mjs';
import { guideStationName } from '../../lib/metro-guide.mjs';
import { stationEditorial, stationLines } from '../../lib/metro-editorial';
import { guideMetadata } from '../zh-tw/guides/content';
import MetroGuideDirectory from './MetroGuideDirectory';
import MetroMapPage from './MetroMapPage';
import { METRO_MAP_COPY } from '../site';
import '../zh-tw/guides/guides.css';
import './food.css';

export const metadata = guideMetadata(METRO_MAP_COPY.taipei["zh-Hant"].title, METRO_MAP_COPY.taipei["zh-Hant"].description, '/metro');
export default function MetroFoodPage() {
  const cities = [
    { id: 'taipei', name: '台北捷運美食', stations: getFoodStations() },
    { id: 'shanghai', name: '上海地鐵美食', stations: getShanghaiFoodStations() },
  ].map(city => ({ ...city, stations: city.stations.map(station => ({
    slug: station.slug, name: guideStationName(station), cover: station.images.slides[0],
    lines: stationLines(station), ...stationEditorial(station),
  })) }));
  return <MetroMapPage><section className="guide-shell metro-food metro-directory" lang="zh-Hant" aria-labelledby="metro-directory-title">
    <a className="guide-back" href="/">← 回到首頁</a>
    <header className="guide-header">
      <p className="guide-eyebrow">SAVVY · METRO FOOD GUIDES</p>
      <h2 className="guide-title" id="metro-directory-title">台北、上海捷運美食攻略</h2>
      <p className="guide-lead">先選一站，再看餐點、參考價格和店家位置。</p>
      <p className="guide-small">{FOOD_DISCLAIMER}</p>
      <nav className="food-city-index" aria-label="依城市找美食"><a href="#taipei">台北捷運</a><a href="#shanghai">上海地鐵</a><a href="#hero">回到捷運地圖</a></nav>
    </header>
    <MetroGuideDirectory cities={cities} />
  </section></MetroMapPage>;
}
