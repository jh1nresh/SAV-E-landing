import { getFoodStations, getShanghaiFoodStations } from '../../lib/metro';
import { FOOD_DISCLAIMER } from '../../lib/metro-logic.mjs';
import { guideStationName } from '../../lib/metro-guide.mjs';
import { stationEditorial, stationLines } from '../../lib/metro-editorial';
import { guideMetadata } from '../zh-tw/guides/content';
import MetroGuideDirectory from './MetroGuideDirectory';
import '../zh-tw/guides/guides.css';
import './food.css';

export const metadata = guideMetadata('台北、上海捷運美食攻略｜按站找餐廳與小吃｜Savvy', '從台北捷運或上海地鐵選一站，查看周邊餐廳、推薦餐點、參考價格、地址與資料來源，搭配地圖安排下一餐。', '/metro');
export default function MetroFoodPage() {
  const cities = [
    { id: 'taipei', name: '台北捷運美食', stations: getFoodStations() },
    { id: 'shanghai', name: '上海地鐵美食', stations: getShanghaiFoodStations() },
  ].map(city => ({ ...city, stations: city.stations.map(station => ({
    slug: station.slug, name: guideStationName(station), cover: station.images.slides[0],
    lines: stationLines(station), ...stationEditorial(station),
  })) }));
  return <main className="guide-shell metro-food" lang="zh-Hant">
    <a className="guide-back" href="/">← 回到首頁</a>
    <header className="guide-header">
      <p className="guide-eyebrow">SAVVY · METRO FOOD GUIDES</p>
      <h1 className="guide-title">台北、上海捷運美食攻略</h1>
      <p className="guide-lead">先選一站，再看餐點、參考價格和店家位置。</p>
      <p className="guide-small">{FOOD_DISCLAIMER}</p>
      <nav className="food-city-index" aria-label="依城市找美食"><a href="#taipei">台北捷運</a><a href="#shanghai">上海地鐵</a><a href="/discover">看捷運地圖</a></nav>
    </header>
    <MetroGuideDirectory cities={cities} />
  </main>;
}
