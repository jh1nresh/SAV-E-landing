import { getShanghaiFoodStations } from "../../lib/metro";
import { FOOD_DISCLAIMER } from "../../lib/metro-logic.mjs";
import { guideMetadata } from "../zh-tw/guides/content";
import "../zh-tw/guides/guides.css";
import "../metro/food.css";
import "../city.css";
import "./shanghai.css";
import { ShanghaiMap } from "./ShanghaiMap";

const PRICE_NOTE_ZH = "價錢是人民幣（¥）。筆記沒寫價錢的店，不顯示金額。出門常用支付寶或微信支付，出發前再確認。";
const PRICE_NOTE_EN = "Prices are renminbi (¥). Shops with no published price stay blank. Alipay and WeChat Pay are common; check before you go.";

export const metadata = guideMetadata(
  "上海地鐵美食｜Savvy",
  "上海已發布的捷運美食筆記。中文地址給司機和店員看。價錢是人民幣（¥）；沒寫價錢的不顯示。",
  "/shanghai",
);

export default function ShanghaiPage() {
  const stations = getShanghaiFoodStations();
  return (
    <main className="guide-shell metro-food sh-page" lang="zh-Hant">
      <header className="guide-header">
        <p className="guide-eyebrow">SAVVY · SHANGHAI</p>
        <h1 className="guide-title zh">上海地鐵，一站一站吃</h1>
        <h1 className="guide-title en">Shanghai, one stop at a time</h1>
        <p className="guide-lead zh">店名和地址用中文，方便給司機或店員看。</p>
        <p className="guide-lead en">Shop names and addresses stay in Chinese, so you can show them to a driver or the counter.</p>
        <p className="guide-small">{FOOD_DISCLAIMER}</p>
        <p className="guide-small zh">{PRICE_NOTE_ZH}</p>
        <p className="guide-small en">{PRICE_NOTE_EN}</p>
      </header>
      <ShanghaiMap stations={stations} />
      <div className="sh-stations">
        {stations.map((station) => (
          <section id={station.slug} key={station.slug}>
            <p className="guide-eyebrow">第 {station.n} 站 · {station.date}{station.metro_lines?.length ? ` · ${station.metro_lines.join("、")} 號線` : ""}</p>
            <h2>{station.station}</h2>
            {station.name_en && <p className="sh-en-name">{station.name_en}</p>}
            {station.tagline && <p className="guide-lead">{station.tagline}</p>}
            <div className="guide-grid food-shops">
              {station.shops.map((shop) => (
                <article className="guide-card zh-address" lang="zh-Hant" key={shop.key ?? shop.name}>
                  {shop.name && <h3>{shop.name}</h3>}
                  <p className="addr-label">中文地址</p>
                  <p className="addr-value">{shop.address}</p>
                  {shop.price ? <p className="addr-price">{shop.price}</p> : null}
                </article>
              ))}
            </div>
            <div className="food-posts">
              {station.posts.instagram && <a href={station.posts.instagram} target="_blank" rel="noopener noreferrer">Instagram ↗</a>}
              {station.posts.threads && <a href={station.posts.threads} target="_blank" rel="noopener noreferrer">Threads ↗</a>}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
