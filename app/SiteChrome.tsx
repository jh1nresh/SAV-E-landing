"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
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

function persistLang(lang: SiteLang) {
  document.documentElement.lang = lang;
  const url = new URL(window.location.href);
  if (lang === "en") url.searchParams.set("lang", "en");
  else url.searchParams.delete("lang");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  if (url.pathname === "/") {
    document.title = lang === "en" ? SITE_TITLE_EN : SITE_TITLE_ZH;
    document.querySelector('meta[name="description"]')?.setAttribute(
      "content",
      lang === "en" ? SITE_DESCRIPTION_EN : SITE_DESCRIPTION_ZH,
    );
  }
}

export function SiteChrome({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<SiteLang>("zh-Hant");

  useEffect(() => {
    const next = parseSiteLang(new URLSearchParams(window.location.search).get("lang"));
    setLangState(next);
    document.documentElement.lang = next;
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

  return (
    <nav className="top">
      <a className="brand" href={hrefWithLang("/", lang)}>
        <img src="/assets/icon.png" alt="" width={44} height={44} />
        Savvy
      </a>
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

export function AppStoreBadge() {
  const { lang } = useSiteLang();
  const noteId = useId();
  return (
    <div className="download-entry">
      <a
        className="badge"
        href={TESTFLIGHT_URL}
        aria-describedby={noteId}
        data-swap="appstore-url"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img
          className="zh"
          src="/assets/appstore-badge-zh.svg"
          alt="在 App Store 下載"
          data-testid="appstore-badge-zh"
        />
        <img
          className="en"
          src="/assets/appstore-badge-en.svg"
          alt="Download on the App Store"
          data-testid="appstore-badge-en"
        />
      </a>
      <p className="download-note" id={noteId}>
        {lang === "en" ? "iOS beta · Install with TestFlight" : "iOS 測試版 · 透過 TestFlight 安裝"}
      </p>
    </div>
  );
}
