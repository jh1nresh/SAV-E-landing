/** Shared date / price rules. No private field names. Browser and Node. */

export function taipeiDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function daysBetween(fromYmd, toYmd) {
  const a = Date.parse(`${fromYmd}T00:00:00+08:00`);
  const b = Date.parse(`${toYmd}T00:00:00+08:00`);
  return Math.round((b - a) / 86400000);
}

/** NEW means strictly fewer than 7 Asia/Taipei days after addedAt. Day 6 = NEW, day 7 and 8 = not NEW. */
export function isNewDate(addedAt, todayYmd) {
  if (!addedAt) return false;
  const age = daysBetween(addedAt, todayYmd);
  return age >= 0 && age < 7;
}

// Asia/Taipei calendar dates; eligibility and display duration are separate rules.
export const NEW_FLOW_START = "2026-10-27";
export const MAX_POST_TO_LIVE_DAYS = 3;

export function isCalendarDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isFresh(store) {
  if (store?.kind !== "post" || store.backfill === true || !isCalendarDate(store.addedAt)) return false;
  const posts = store.sourcePosts;
  if (!Array.isArray(posts) || !posts.length || posts.some((p) => !isCalendarDate(p?.date))) return false;
  const postDate = posts.map((p) => p.date).sort().at(-1);
  const delay = daysBetween(postDate, store.addedAt);
  return postDate >= NEW_FLOW_START && delay >= 0 && delay <= MAX_POST_TO_LIVE_DAYS;
}

export function isNewStore(store, todayYmd) {
  return isFresh(store) && isCalendarDate(todayYmd) && isNewDate(store.addedAt, todayYmd);
}

export function stationIsNew(stores, todayYmd) {
  return stores.some((s) => isNewStore(s, todayYmd));
}

export function formatMd(ymd) {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${m}/${d}`;
}

/** DESIGN copy. One constant so the pending-price line is easy to change. */
export const PRICE_PENDING_LABEL = "價格待查";

/** 示意 unless verified === true AND priceCheckedAt is a non-empty date. */
export function priceIsEstimate(store) {
  if (store.pricePending) return false;
  return store.verified !== true || !store.priceCheckedAt;
}

export function priceIsPending(store) {
  return store.pricePending === true || store.priceNT == null;
}

export function resolveClock(search, now = new Date()) {
  const raw = search instanceof URLSearchParams ? search.get("clock") : search;
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return taipeiDate(now);
}

/**
 * Per-entry provenance. "example" = illustrative sample entry; "post" = an entry grown from a
 * real founder post. Anything that is not exactly "post" is treated as example (fail-safe: labelled).
 */
export const STORE_KINDS = ["example", "post"];

export function isExampleStore(store) {
  return !store || store.kind !== "post";
}

/**
 * Map-level stamp (DESIGN P0-10). All strings for the stamp and the "n 間" counts live here so a copy change is one line.
 *  - every entry is an example   -> "範例資料 · 示意" (full stamp)
 *  - mixed (post + example)      -> "部分為範例" (smaller secondary stamp)
 *  - every entry is a post / none -> no stamp
 * Copy is zh-TW by default; `lang: "en"` returns the English equivalent (the live map is zh-Hant only today).
 */
export const EXAMPLE_STAMP_NOTE = "範例資料 · 示意";
export const EXAMPLE_STAMP_NOTE_EN = "Example data · illustrative";
export const PARTIAL_STAMP_NOTE = "部分為範例";
export const PARTIAL_STAMP_NOTE_EN = "Some examples";

/** "example" | "partial" | "none". Unknown kinds count as example (fail-safe). */
export function stampLevel(stores) {
  if (!stores || stores.length === 0) return "none";
  const examples = stores.filter(isExampleStore).length;
  if (examples === 0) return "none";
  return examples === stores.length ? "example" : "partial";
}

export function stampNote(stores, lang = "zh") {
  const level = stampLevel(stores);
  const en = lang === "en";
  if (level === "example") return en ? EXAMPLE_STAMP_NOTE_EN : EXAMPLE_STAMP_NOTE;
  if (level === "partial") return en ? PARTIAL_STAMP_NOTE_EN : PARTIAL_STAMP_NOTE;
  return "";
}

/** Plain "n 間" / "n places" (no provenance split). */
export function countShort(n, lang = "zh") {
  return lang === "en" ? `${n} ${n === 1 ? "place" : "places"}` : `${n} 間`;
}

/**
 * "n 間" count for a set of entries. The two provenances are never added into one bare number when mixed:
 *  mixed -> "n 間（x 間來自貼文、y 間為範例）" / "n places (x from posts, y examples)".
 * All example, all post, or empty -> plain "n 間" / "n places".
 */
export function countLabel(stores, lang = "zh") {
  const n = stores.length;
  const y = stores.filter(isExampleStore).length;
  const x = n - y;
  if (x === 0 || y === 0) return countShort(n, lang);
  return lang === "en"
    ? `${n} places (${x} from posts, ${y} examples)`
    : `${n} 間（${x} 間來自貼文、${y} 間為範例）`;
}

/** Compact provenance split for the map pin's narrow badge. */
export function countBadge(stores) {
  const examples = stores.filter(isExampleStore).length;
  const posts = stores.length - examples;
  return examples && posts ? `${posts} 貼文 · ${examples} 範例` : countShort(stores.length);
}

/** Count eligible, non-backfill posts within seven days of go-live. */
export function weekNewCount(stores, todayYmd) {
  return stores.filter((s) => isNewStore(s, todayYmd)).length;
}

const FOOT_IMAGE_NOTE = "菜圖為 AI 示意，非店家實拍。";
const FOOT_EXAMPLE_PRICE_NOTE = "價格為示意。";
const ALT_SUFFIX = "（AI 示意圖）";

/** imageAi === false (public, derived at build from the internal image source) marks a founder/licensed photo. Absent = AI. */
/** Card footer for one entry. Example: image + price disclosure (unchanged copy). Post: image note only, price is shown as 價格待查. */
export function footNote(store) {
  const image = isExampleStore(store) || (store.image && store.imageAi !== false) ? FOOT_IMAGE_NOTE : "";
  return image + (isExampleStore(store) ? FOOT_EXAMPLE_PRICE_NOTE : "");
}

export function imageAlt(store) {
  return `${store.dish || store.name}${isExampleStore(store) || store.imageAi !== false ? ALT_SUFFIX : ""}`;
}
