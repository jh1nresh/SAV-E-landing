export const TESTFLIGHT_URL =
  process.env.NEXT_PUBLIC_TESTFLIGHT_URL ??
  "https://testflight.apple.com/join/aSVm9hRJ";

export const SUPPORT_EMAIL = "support@sav-e.app";

export type SiteLang = "zh-Hant" | "en";

export function parseSiteLang(value: string | null | undefined): SiteLang {
  return value === "en" ? "en" : "zh-Hant";
}

export function hrefWithLang(path: string, lang: SiteLang): string {
  if (path.startsWith("mailto:") || path.startsWith("http")) return path;
  return lang === "en" ? `${path}?lang=en` : path;
}

export const LANG_BOOT_SCRIPT = `(()=>{const q=new URLSearchParams(location.search).get("lang");document.documentElement.lang=q==="en"?"en":"zh-Hant";})();`;
