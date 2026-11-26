export const TESTFLIGHT_URL =
  process.env.NEXT_PUBLIC_TESTFLIGHT_URL ??
  "https://testflight.apple.com/join/aSVm9hRJ";

export const SUPPORT_EMAIL = "support@sav-e.app";

export const SITE_TITLE_ZH = "Savvy：把連結存成地圖上的點";
export const SITE_DESCRIPTION_ZH =
  "Savvy 是地點記憶：存連結、確認地點、蓋在地圖上。另有台北與上海捷運美食。";

export const METRO_MAP_COPY = {
  taipei: {
    "zh-Hant": { title: "台北捷運美食地圖｜Savvy", description: "在台北捷運美食地圖選站，查看站邊店家與完整攻略。" },
    en: { title: "Taipei MRT food map | Savvy", description: "Choose a Taipei MRT station to find nearby restaurants and food guides." },
  },
  shanghai: {
    "zh-Hant": { title: "上海地鐵美食地圖｜Savvy", description: "在上海地鐵美食地圖選站，查看站邊店家與完整攻略。價格以人民幣標示。" },
    en: { title: "Shanghai metro food map | Savvy", description: "Choose a Shanghai metro station to find nearby restaurants and food guides. Prices are in CNY." },
  },
} as const;

export const isMetroMapPath = (path: string) => path === "/metro" || path === "/shanghai";

export type SiteLang = "zh-Hant" | "en";

export function parseSiteLang(value: string | null | undefined): SiteLang {
  return value === "en" ? "en" : "zh-Hant";
}

export function hrefWithLang(path: string, lang: SiteLang): string {
  if (path.startsWith("mailto:") || path.startsWith("http")) return path;
  return lang === "en" ? `${path}?lang=en` : path;
}

export const LANG_BOOT_SCRIPT = `(() => {
  const root = document.documentElement;
  const query = new URLSearchParams(location.search);
  root.classList.add("js");
  try {
    if (localStorage.getItem("savvy.workspace.theme") === "dark") root.dataset.theme = "dark";
  } catch {}
  root.lang = query.get("lang") === "en" ? "en" : "zh-Hant";
  if (query.get("embed") !== "atlas" || !["/metro", "/shanghai"].includes(location.pathname)) return;
  try {
    if (window.parent === window || window.parent.location.origin !== location.origin) return;
    root.dataset.atlasMetro = "";
    // Open station articles in the main browser window, outside the small map frame.
    const base = document.createElement("base");
    base.target = "_top";
    document.head.append(base);
  } catch {}
})();`;
