"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
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
      <a href={hrefWithLang("/privacy", lang)}>Savvy Privacy Policy</a>
      <a href={hrefWithLang("/support", lang)}>Savvy Support</a>
      <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
    </footer>
  );
}

export function AppStoreBadge() {
  return (
    <a className="badge" href={TESTFLIGHT_URL} data-swap="appstore-url">
      <img
        className="zh"
        src="/assets/appstore-badge-zh.svg"
        alt="在 App Store 下載"
      />
      <img
        className="en"
        src="/assets/appstore-badge-en.svg"
        alt="Download on the App Store"
      />
    </a>
  );
}
