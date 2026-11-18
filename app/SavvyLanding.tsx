import { CityHeroMap } from "./metro/CityHeroMap";
import { AppStoreBadge } from "./SiteChrome";
import "./metro/hero-map.css";
import PlaceChooser from "./choose/PlaceChooser";
import "./choose/chooser.css";

import { GUIDE_ROOT, guidePath, guides } from "./zh-tw/guides/content";
import "./zh-tw/guides/guides.css";
import { HERO_EN, HERO_ZH, SITE_TITLE_EN, SITE_TITLE_ZH } from "./site";

const STICKERS = [
  { src: "/assets/st-duck.png", alt: "珍珠奶茶" },
  { src: "/assets/st-noodle.png", alt: "麵碗" },
  { src: "/assets/st-coffee.png", alt: "咖啡杯" },
  { src: "/assets/st-temple.png", alt: "台北101" },
  { src: "/assets/st-lantern.png", alt: "燈籠" },
] as const;

export default function SavvyLanding({ clock }: { clock: string }) {
  return (
    <main>
      <section className="choose" id="choose">
        <div className="choose-intro">
          <div className="choose-intro-copy">
            <h1 className="h zh">
              <span>看到喜歡的存下</span>
              <span className="u">去過的都記得</span>
            </h1>
            <h1 className="h en">
              <span>Save what you love</span>
              <span>
                Remember where <span className="u">you've been</span>
              </span>
            </h1>
            <p className="choose-lead zh">先從已上站的捷運筆記挑現在吃什麼。</p>
            <p className="choose-lead en">Choose what to eat now from the published metro notes.</p>
          </div>
          <div data-testid="hero-appstore">
            <AppStoreBadge />
          </div>
        </div>
        <PlaceChooser />
      </section>

      <section className="s1 hero" id="hero">
        <div className="wrap">
          <div className="txt">
            <p className="sub zh">
              {HERO_ZH[0]}
              <br />
              {HERO_ZH[1]}
              <br />
              {HERO_ZH[2]}
            </p>
            <p className="sub en">
              {HERO_EN[0]}
              <br />
              {HERO_EN[1]}
              <br />
              {HERO_EN[2]}
            </p>
            <div className="hero-stk" aria-label="Savvy stickers">
              {STICKERS.map((s) => (
                <img key={s.src} src={s.src} alt={s.alt} width={58} height={58} />
              ))}
            </div>
          </div>
          <CityHeroMap clock={clock} />
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

      <section className="s-cta" id="cta">
        <div className="ctaw">
          <h2 className="h zh">
            <span>想把店留到之後</span>
            <span className="u">用 Savvy 自己收</span>
          </h2>
          <h2 className="h en">
            <span>Keep a place for later</span>
            <span className="u">in your own Savvy</span>
          </h2>
          <p className="sub zh">{SITE_TITLE_ZH}</p>
          <p className="sub en">{SITE_TITLE_EN}</p>
          <AppStoreBadge />
          <div className="stkrow">
            <img src="/assets/st-noodle.png" alt="" width={66} height={66} loading="lazy" decoding="async" />
            <img src="/assets/st-coffee.png" alt="" width={66} height={66} loading="lazy" decoding="async" />
            <img src="/assets/st-lantern.png" alt="" width={66} height={66} loading="lazy" decoding="async" />
          </div>
        </div>
      </section>
    </main>
  );
}
