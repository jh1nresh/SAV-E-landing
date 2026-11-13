/** Station dropdown rows. Search matching stays in station-search.mjs. */

import { buildSearchIndex, lineText } from "./station-search.mjs";

export const TAIPEI_LINE_COLOR = {
  L_red: "#b4443a",
  L_blue: "#3f6fb0",
  L_green: "#3f9b6b",
  L_orange: "#e0902a",
};

/** Newest date first. The same date keeps the larger station number. */
export function compareNewest(a, b) {
  return (b.date || "").localeCompare(a.date || "") || b.n - a.n;
}

export function monthKey(date) {
  return String(date || "").slice(0, 7);
}

export function monthLabel(date) {
  const month = Number(monthKey(date).slice(5, 7));
  return month ? `${month} 月` : "";
}

export function latestStation(stations) {
  return stations.slice().sort(compareNewest)[0] ?? null;
}

/** Newest first, grouped by calendar month. */
export function groupByMonth(stations) {
  const groups = [];
  for (const station of stations.slice().sort(compareNewest)) {
    const key = monthKey(station.date);
    const last = groups[groups.length - 1];
    if (!last || last.key !== key) groups.push({ key, label: monthLabel(station.date), items: [station] });
    else last.items.push(station);
  }
  return groups;
}

function addDays(ymd, days) {
  const date = new Date(`${ymd}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Test hook: grow a station list without touching content files.
 * Added rows are newer than the current latest, so the default selection moves.
 */
export function withFixtureCount(stations, count) {
  const target = Math.min(80, Math.floor(Number(count)) || 0);
  if (target <= stations.length) return stations.slice();
  const latest = latestStation(stations);
  const out = stations.slice();
  const baseDate = latest?.date || "2026-11-08";
  const baseN = latest?.n ?? stations.length;
  for (let i = stations.length; i < target; i += 1) {
    const step = i - stations.length + 1;
    const n = baseN + step;
    const slug = `fixture-station-${n}`;
    out.push({
      ...(latest ?? stations[0]),
      n,
      station: `測試站${n}`,
      slug,
      selectId: slug,
      date: addDays(baseDate, step),
      shops: [],
      nameEn: null,
      lineName: latest?.lineName ?? "",
    });
  }
  return out;
}

/** Join the search index with the date and line colour the dropdown renders. */
export function buildPickerStations(foodStations, metroStations = [], lineColors = {}) {
  const foodBySlug = new Map(foodStations.map((station) => [station.slug, station]));
  return buildSearchIndex(foodStations, metroStations).map((station) => {
    const food = foodBySlug.get(station.slug);
    const code = food?.map?.line ?? "";
    return {
      ...station,
      date: food?.date || "",
      lineColor: lineColors[code] || "#2f2e23",
      lineName: lineText(station),
    };
  });
}
