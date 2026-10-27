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

/** Map-level stamp line. Only when EVERY entry is an example; once a real entry exists the cards carry the label. */
export const EXAMPLE_STAMP_NOTE = "範例資料 · 示意";
export function stampNote(stores) {
  return stores.length > 0 && stores.every(isExampleStore) ? EXAMPLE_STAMP_NOTE : "";
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
