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
  return daysBetween(addedAt, todayYmd) < 7;
}

export function formatMd(ymd) {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${m}/${d}`;
}

/** 示意 unless verified === true AND priceCheckedAt is a non-empty date. */
export function priceIsEstimate(store) {
  return store.verified !== true || !store.priceCheckedAt;
}

export function resolveClock(search, now = new Date()) {
  const raw = search instanceof URLSearchParams ? search.get("clock") : search;
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return taipeiDate(now);
}
