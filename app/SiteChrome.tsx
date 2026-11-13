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

function applyHomeMeta(lang: SiteLang) {
  if (window.location.pathname !== "/") return;
  const title = lang === "en" ? SITE_TITLE_EN : SITE_TITLE_ZH;
  const description = lang === "en" ? SITE_DESCRIPTION_EN : SITE_DESCRIPTION_ZH;
  if (document.title !== title) document.title = title;
  const metas = [...document.querySelectorAll('meta[name="description"]')];
  const [first, ...rest] = metas;
  if (first && first.getAttribute("content") !== description) first.setAttribute("content", description);
  for (const extra of rest) extra.remove();
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
  const [lang, setLangState] = useState<SiteLang>("zh-Hant");

  useEffect(() => {
    const read = () => parseSiteLang(new URLSearchParams(window.location.search).get("lang"));
    const next = read();
    setLangState(next);
    document.documentElement.lang = next;
    applyHomeMeta(next);
    // Next applies the prerendered Chinese metadata after this effect. Keep the
    // title and description on the language the URL already chose.
    const observer = new MutationObserver(() => applyHomeMeta(read()));
    observer.observe(document.head, { subtree: true, childList: true, attributes: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  const setLang = useCallback((next: SiteLang) => {
    setLangState(next);
    persistLang(next);
  }, []);

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      <SiteNav />
      {children}
      <SiteFooter />
    </LangContext.Provider>
  );
}

function SiteNav() {
  const { lang, setLang } = useSiteLang();
  const pathname = usePathname();
  const city = pathname === "/shanghai" ? "shanghai" : pathname === "/" ? "taipei" : null;

  return (
    <nav className={city ? "top has-city" : "top"}>
      <a className="brand" href={hrefWithLang("/", lang)}>
        <img src="/assets/icon.png" alt="" width={44} height={44} />
        Savvy
      </a>
      {city ? <CitySwitch active={city} lang={lang} /> : null}
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
    </nav>
  );
}

function SiteFooter() {
  const { lang } = useSiteLang();

  return (
    <footer className="site">
      <a href="/about">About Savvy</a>
      <a href="/contact">Contact</a>
      <a href="/docs">Savvy API documentation</a>
      <a href="https://github.com/jh1nresh/SAV-E-landing">GitHub</a>
      <a href="/metro" lang="zh-Hant">捷運美食清單</a>
      <a href="/zh-tw/guides" lang="zh-Hant">收藏整理指南（繁體中文）</a>
      <a href={hrefWithLang("/privacy", lang)}>Savvy Privacy Policy</a>
      <a href={hrefWithLang("/support", lang)}>Savvy Support</a>
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
