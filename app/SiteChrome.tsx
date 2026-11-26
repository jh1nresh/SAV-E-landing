"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import CitySwitch from "./CitySwitch";
import {
  SITE_DESCRIPTION_EN,
  SITE_DESCRIPTION_ZH,
  SITE_TITLE_EN,
  SITE_TITLE_ZH,
  SUPPORT_EMAIL,
  TESTFLIGHT_URL,
  hrefWithLang,
  parseSiteLang,
  type SiteLang,
} from "./site";

const LangContext = createContext<{
  lang: SiteLang;
  setLang: (lang: SiteLang) => void;
}>({
  lang: "zh-Hant",
  setLang: () => undefined,
});

export function useSiteLang() {
  return useContext(LangContext);
}

export type CityId = "taipei" | "shanghai";
const CityContext = createContext<{ city: CityId; setCity: (city: CityId) => void }>({ city: "taipei", setCity: () => undefined });
export function useSiteCity() { return useContext(CityContext); }

function applyHomeMeta(lang: SiteLang) {
  if (window.location.pathname !== "/discover") return;
  const title = lang === "en" ? SITE_TITLE_EN : SITE_TITLE_ZH;
  const description = lang === "en" ? SITE_DESCRIPTION_EN : SITE_DESCRIPTION_ZH;
  if (document.title !== title) document.title = title;
  // Next can render duplicate metadata during hydration. Keep the nodes
  // attached so React can reconcile them, with only one description exposed.
  const [first, ...rest] = document.querySelectorAll('meta[name="description"], meta[data-savvy-description]');
  if (!first) return;
  if (first.getAttribute("name") !== "description") first.setAttribute("name", "description");
  if (first.getAttribute("content") !== description) first.setAttribute("content", description);
  for (const extra of rest) {
    if (!extra.hasAttribute("name")) continue;
    extra.setAttribute("data-savvy-description", "");
    extra.removeAttribute("name");
  }
}

function persistLang(lang: SiteLang) {
  document.documentElement.lang = lang;
  const url = new URL(window.location.href);
  if (lang === "en") url.searchParams.set("lang", "en");
  else url.searchParams.delete("lang");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  applyHomeMeta(lang);
}

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [city, setCityState] = useState<CityId>(pathname === "/shanghai" ? "shanghai" : "taipei");
  useEffect(() => {
    const readCity = () => {
      const query = new URLSearchParams(window.location.search).get("city");
      setCityState(query === "shanghai" || (!query && window.location.pathname === "/shanghai") ? "shanghai" : "taipei");
    };
    readCity();
    window.addEventListener("popstate", readCity);
    return () => window.removeEventListener("popstate", readCity);
  }, [pathname]);
  const setCity = useCallback((next: CityId) => {
    const url = new URL(window.location.href);
    if (next === "shanghai") url.searchParams.set("city", next);
    else url.searchParams.delete("city");
    url.hash = "";
    window.history.pushState(null, "", `/discover${url.search}`);
    setCityState(next);
  }, []);
  const [lang, setLangState] = useState<SiteLang>("zh-Hant");

  useEffect(() => {
    const read = () => parseSiteLang(new URLSearchParams(window.location.search).get("lang"));
    const sync = () => {
      const next = read();
      setLangState(next);
      document.documentElement.lang = next;
      applyHomeMeta(next);
    };
    sync();
    window.addEventListener("popstate", sync);
    // Next applies the prerendered Chinese metadata after this effect. Keep the
    // title and description on the language the URL already chose.
    const observer = new MutationObserver(() => applyHomeMeta(read()));
    observer.observe(document.head, { subtree: true, childList: true, attributes: true, characterData: true });
    return () => { observer.disconnect(); window.removeEventListener("popstate", sync); };
  }, []);

  const setLang = useCallback((next: SiteLang) => {
    setLangState(next);
    persistLang(next);
  }, []);

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      <CityContext.Provider value={{ city, setCity }}>
        <SiteNav />
        {children}
        <SiteFooter />
      </CityContext.Provider>
    </LangContext.Provider>
  );
}

function SiteNav() {
  const { lang, setLang } = useSiteLang();
  const pathname = usePathname();
  const { city, setCity } = useSiteCity();
  const hasCity = pathname === "/shanghai" || pathname === "/discover";
  const workspace = [
    ["trips", "我的行程", "My trips"],
    ["atlas", "城市圖鑑", "Atlas"],
    ["collection", "收藏", "Collections"],
    ["journey", "遊記", "Journey"],
    ["app", "App", "App"],
  ] as const;
  const workspaceLinks = workspace.map(([route, zh, en]) => (
    <a key={route} href={`${hrefWithLang("/", lang)}#${route}`}>{lang === "en" ? en : zh}</a>
  ));

  return (
    <nav className={hasCity ? "top has-city" : "top editorial-nav"} aria-label={lang === "en" ? "Main navigation" : "主導覽"}>
      <a className="brand" href={hrefWithLang("/", lang)}>
        <img src="/icon.png" alt="" width={44} height={44} />
        Savvy
      </a>
      {hasCity ? <CitySwitch active={city} lang={lang} onSelect={setCity} /> : (
        <div className="editorial-tabs">{workspaceLinks}</div>
      )}
      <div className="chips" role="group" aria-label="Language">
        <button
          type="button"
          className="chip"
          data-l="zh-Hant"
          aria-pressed={lang === "zh-Hant"}
          onClick={() => setLang("zh-Hant")}
        >
          中文
        </button>
        <button
          type="button"
          className="chip"
          data-l="en"
          aria-pressed={lang === "en"}
          onClick={() => setLang("en")}
        >
          EN
        </button>
      </div>
      {!hasCity && (
        <details className="mobile-nav" onKeyDown={event => {
          const menu = event.currentTarget;
          if (event.key !== "Escape" || !menu.open) return;
          menu.open = false;
          menu.querySelector("summary")?.focus();
        }}>
          <summary aria-label={lang === "en" ? "Menu" : "選單"} />
          <div className="mobile-nav-links" onClick={event => {
            if (!(event.target instanceof HTMLAnchorElement)) return;
            event.currentTarget.closest("details")?.removeAttribute("open");
          }}>{workspaceLinks}</div>
        </details>
      )}
    </nav>
  );
}

function SiteFooter() {
  const { lang } = useSiteLang();
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const update = () => setDark(document.documentElement.dataset.theme === "dark");
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  function toggleTheme() {
    const theme = dark ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    setDark(!dark);
    try { localStorage.setItem("savvy.workspace.theme", theme); } catch {}
  }

  return (
    <footer className="site">
      <nav className="editorial-links" aria-label={lang === "en" ? "Savvy resources" : "Savvy 資源"}>
        <a href="/zh-tw/travel" lang="zh-Hant">旅行攻略</a>
        <a href="/zh-tw/posts" lang="zh-Hant">城市貼文</a>
        <a href="/zh-tw/guides" lang="zh-Hant">收藏整理指南（繁體中文）</a>
        <a href="/metro" lang="zh-Hant">捷運美食清單</a>
        <a href={hrefWithLang("/privacy", lang)}>Savvy Privacy Policy</a>
        <a href={hrefWithLang("/support", lang)}>Savvy Support</a>
      </nav>
      <button type="button" className="chip editorial-theme" role="switch" aria-checked={dark} onClick={toggleTheme}>
        {lang === "en" ? "Dark mode" : "深色模式"}
      </button>
      <a href="/about">About Savvy</a>
      <a href="/contact">Contact</a>
      <a href="/docs">Savvy API documentation</a>
      <a href="https://github.com/jh1nresh/SAV-E-landing">GitHub</a>
      <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      <p>
        <a
          href="https://www.openstreetmap.org/copyright"
          rel="noopener noreferrer"
          data-testid="osm-attribution"
        >
          Map data © OpenStreetMap contributors
        </a>
      </p>
    </footer>
  );
}

const DOWNLOAD_LABELS = {
  "zh-Hant": "在 App Store 下載",
  en: "Download on the App Store",
} as const;

export function AppStoreBadge() {
  const { lang } = useSiteLang();
  const noteId = useId();
  return (
    <a
      className="download-entry badge"
      href={TESTFLIGHT_URL}
      aria-label={DOWNLOAD_LABELS[lang]}
      aria-describedby={noteId}
      data-swap="appstore-url"
      target="_blank"
      rel="noopener noreferrer"
    >
      <img
        className="zh"
        src="/assets/appstore-badge-zh.svg"
        alt={DOWNLOAD_LABELS["zh-Hant"]}
        data-testid="appstore-badge-zh"
      />
      <img
        className="en"
        src="/assets/appstore-badge-en.svg"
        alt={DOWNLOAD_LABELS.en}
        data-testid="appstore-badge-en"
      />
      <p className="download-note" id={noteId}>
        {lang === "en" ? "iOS beta · Install with TestFlight" : "iOS 測試版 · 透過 TestFlight 安裝"}
      </p>
    </a>
  );
}
