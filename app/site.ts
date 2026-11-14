export const TESTFLIGHT_URL =
  process.env.NEXT_PUBLIC_TESTFLIGHT_URL ??
  "https://testflight.apple.com/join/aSVm9hRJ";

export const SUPPORT_EMAIL = "support@sav-e.app";

export const SITE_TITLE_EN = "Savvy: Turn links into pins";
export const SITE_TITLE_ZH = "Savvy：把連結存成地圖上的點";
export const SITE_DESCRIPTION_EN =
  "Savvy is place memory — save a link, confirm the spot, stamp it on your map. Plus Taipei and Shanghai metro food.";
export const SITE_DESCRIPTION_ZH =
  "Savvy 是地點記憶：存連結、確認地點、蓋在地圖上。另有台北與上海捷運美食。";

export const HERO_EN = [
  "Place memory for links you care about.",
  "Save a link → confirm the place → pin it on your map.",
  "Also: Taipei and Shanghai metro food, one station at a time.",
] as const;

export const HERO_ZH = [
  "把想去的店存成地圖上的記憶。",
  "存連結 → 確認地點 → 地圖章。",
  "另有台北與上海捷運美食，每天一站。",
] as const;

export type SiteLang = "zh-Hant" | "en";

export function parseSiteLang(value: string | null | undefined): SiteLang {
  return value === "en" ? "en" : "zh-Hant";
}

export function hrefWithLang(path: string, lang: SiteLang): string {
  if (path.startsWith("mailto:") || path.startsWith("http")) return path;
  return lang === "en" ? `${path}?lang=en` : path;
}

export const LANG_BOOT_SCRIPT = `(()=>{document.documentElement.classList.add("js");const en=new URLSearchParams(location.search).get("lang")==="en";document.documentElement.lang=en?"en":"zh-Hant";if(en&&location.pathname==="/"){document.title=${JSON.stringify(SITE_TITLE_EN)};const meta=document.querySelector('meta[name="description"]');if(meta)meta.setAttribute("content",${JSON.stringify(SITE_DESCRIPTION_EN)});}})();`;
