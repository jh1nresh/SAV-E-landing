import { getFoodStations, getShanghaiFoodStations } from "../lib/metro";
import { LangHref } from "./LangHref";
import { AppStoreBadge } from "./SiteChrome";
import { GUIDE_ROOT, guidePath, guides } from "./zh-tw/guides/content";
import "./zh-tw/guides/guides.css";
import "./city.css";

const CITIES = [
  { id: "taipei", href: "/taipei", zh: "台北", en: "Taipei", count: () => getFoodStations().length },
  { id: "shanghai", href: "/shanghai", zh: "上海", en: "Shanghai", count: () => getShanghaiFoodStations().length },
] as const;

export default function CitySelect() {
  return (
    <main>
      <section className="s1 hero" id="hero">
        <div className="city-pick">
          <h1 className="h zh">
            <span>先選城市</span>
          </h1>
          <h1 className="h en">
            <span>Pick a city</span>
          </h1>
          <p className="sub zh">台北與上海並列，一站一站吃。</p>
          <p className="sub en">Taipei and Shanghai, side by side.</p>
          <div className="city-grid">
            {CITIES.map((city) => (
              <LangHref className="city-card" testId={`city-card-${city.id}`} href={city.href} key={city.id}>
                <span className="city-tape" aria-hidden="true" />
                <span className="city-zh">{city.zh}</span>
                <span className="city-en">{city.en}</span>
                <span className="city-count">{city.count()} 站</span>
              </LangHref>
            ))}
          </div>
          <div data-testid="hero-appstore">
            <AppStoreBadge />
          </div>
        </div>
      </section>
      <section className="guide-home" lang="zh-Hant" aria-labelledby="guide-home-title">
        <p className="guide-eyebrow">收藏整理指南 · 繁體中文</p>
        <h2 id="guide-home-title">找到想去的店，接著呢？</h2>
        <p>從一則貼文、一份收藏，到自己地圖上的點。</p>
        <div className="guide-grid">
          {guides.map((guide) => <a className="guide-card" key={guide.slug} href={guidePath(guide.slug)}><h3>{guide.label}</h3><p>{guide.description}</p><span className="guide-read">閱讀指南 →</span></a>)}
        </div>
        <a href={GUIDE_ROOT}>查看全部整理指南 →</a>
      </section>
    </main>
  );
}
