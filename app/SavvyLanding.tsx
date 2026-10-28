import { AppStoreBadge } from "./SiteChrome";
import { getPublicMetroData } from "../lib/metro";
import { HeroMapLazy } from "./metro/HeroMapLazy";
import "./metro/hero-map.css";

import { GUIDE_ROOT, guidePath, guides } from "./zh-tw/guides/content";
import "./zh-tw/guides/guides.css";

const STICKERS = [
  { src: "/assets/st-duck.png", alt: "珍珠奶茶" },
  { src: "/assets/st-noodle.png", alt: "麵碗" },
  { src: "/assets/st-coffee.png", alt: "咖啡杯" },
  { src: "/assets/st-temple.png", alt: "台北101" },
  { src: "/assets/st-lantern.png", alt: "燈籠" },
] as const;

export default function SavvyLanding() {
  const metro = getPublicMetroData();

  return (
    <main>
      <section className="s1 hero" id="hero">
        <div className="wrap">
          <div className="txt">
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
            <p className="sub">Savvy: Turn links into pins</p>
            <div data-testid="hero-appstore">
              <AppStoreBadge />
            </div>
            <div className="hero-stk" aria-label="Savvy stickers">
              {STICKERS.map((s) => (
                <img key={s.src} src={s.src} alt={s.alt} width={58} height={58} />
              ))}
            </div>
          </div>
          <HeroMapLazy data={metro} />
        </div>
      </section>

      <section className="s2 rev">
        <div className="wrap">
          <div className="txt">
            <h2 className="h zh">
              <span>去過了蓋個章</span>
              <span className="k u">集滿你的城市</span>
            </h2>
            <h2 className="h en">
              <span>Been there?</span>
              <span className="k u">Stamp it</span>
            </h2>
          </div>
          <div className="dev one">
            <img
              className="zh"
              src="/assets/phones-zh-2.png"
              alt="Savvy 蓋章與護照畫面"
              data-testid="first-screen-phone-zh"
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
            <img
              className="en"
              src="/assets/phones-en-2.png"
              alt="Savvy stamp and Passport screens"
              data-testid="first-screen-phone-en"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </section>

      <section className="s3">
        <div className="wrap">
          <div className="txt">
            <h2 className="h zh">
              <span>打開地圖都是回憶</span>
              <span className="u">和朋友一起收</span>
            </h2>
            <h2 className="h en">
              <span>Your map of memories</span>
              <span className="u">Collect with friends</span>
            </h2>
          </div>
          <div className="dev">
            <img
              className="zh"
              src="/assets/phones-zh-3.png"
              alt="Savvy 地圖與朋友畫面"
              loading="lazy"
              decoding="async"
            />
            <img
              className="en"
              src="/assets/phones-en-3.png"
              alt="Savvy map and Friends screens"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </section>

      <section className="s4 rev">
        <div className="wrap">
          <div className="txt">
            <h2 className="h zh">
              <span>白天黑夜都好看</span>
              <span>
                想去的地方<span className="k">都收藏</span>
              </span>
            </h2>
            <h2 className="h en">
              <span>Day or night</span>
              <span>
                <span className="k">Save</span> every place
              </span>
            </h2>
          </div>
          <div className="dev">
            <img
              className="zh"
              src="/assets/phones-zh-4.png"
              alt="Savvy 深色與淺色模式首頁畫面"
              loading="lazy"
              decoding="async"
            />
            <img
              className="en"
              src="/assets/phones-en-4.png"
              alt="Savvy home screen in dark and light mode"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </section>

      <section className="guide-home" lang="zh-Hant" aria-labelledby="guide-home-title">
        <p className="guide-eyebrow">收藏整理指南 · 繁體中文</p>
        <h2 id="guide-home-title">找到想去的店，接著呢？</h2>
        <p>從一則貼文、一份收藏，到自己的地圖與行程。</p>
        <div className="guide-grid">
          {guides.map((guide) => <a className="guide-card" key={guide.slug} href={guidePath(guide.slug)}><h3>{guide.label}</h3><p>{guide.description}</p><span className="guide-read">閱讀指南 →</span></a>)}
        </div>
        <a href={GUIDE_ROOT}>查看全部整理指南 →</a>
      </section>

      <section className="s-cta" id="cta">
        <div className="ctaw">
          <h2 className="h zh">
            <span>把想吃的好店</span>
            <span className="u">存進你的地圖</span>
          </h2>
          <h2 className="h en">
            <span>Save the places you love</span>
            <span className="u">onto your map</span>
          </h2>
          <p className="sub">Savvy: Turn links into pins</p>
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
