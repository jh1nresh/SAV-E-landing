/** Station / shop / dish filtering for the city-page 「找一站」 search. */

export const EMPTY_RESULTS = "這個篩選下沒有符合的站，換個字試試。";

/** Popup shows about this many rows before the scroll hint. Matches the approved mock. */
export const SCROLL_HINT_AFTER = 4;

const SYSTEM = { taipei: "台北捷運", shanghai: "上海地鐵" };

export function groupLabel(city) {
  return SYSTEM[city] ?? "";
}

export function linesOf(station) {
  if (station.city === "shanghai") return (station.metroLines ?? []).map((line) => `${line} 號線`);
  return station.line ? [station.line] : [];
}

export function lineText(station) {
  return linesOf(station).join("、");
}

export function stationMeta(station) {
  const line = lineText(station);
  return line ? `第 ${station.n} 站 · ${line}` : `第 ${station.n} 站`;
}

function compareLines(a, b) {
  return (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0) || a.localeCompare(b, "zh-Hant");
}

/** Lines that appear on at least one station, not the whole schematic. */
export function lineOptions(stations) {
  return [...new Set(stations.flatMap(linesOf))].sort(compareLines);
}

function haystack(station) {
  return [station.station, station.nameEn ?? "", ...station.shops.flatMap((shop) => [shop.name, shop.dish ?? ""])];
}

export function matchesQuery(station, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return haystack(station).some((text) => text.toLowerCase().includes(q));
}

export function filterStations(stations, { line = "all", query = "" } = {}) {
  return stations.filter((station) => (line === "all" || linesOf(station).includes(line)) && matchesQuery(station, query));
}

/** Shop line for a row. Hidden when the query is empty or the station name itself matched. */
export function matchShop(station, query) {
  const q = query.trim().toLowerCase();
  if (!q || station.station.toLowerCase().includes(q)) return undefined;
  return station.shops.find((shop) => shop.name.toLowerCase().includes(q) || (shop.dish ?? "").toLowerCase().includes(q));
}

export function resultCountText(count, query) {
  const q = query.trim();
  const base = q ? `${count} 站符合「${q}」` : `共 ${count} 站`;
  return count > SCROLL_HINT_AFTER ? `${base} · 往下捲看更多` : base;
}

/** Chinese stand-in for the SDK's English list announcements. Unknown changes stay silent. */
export function announcement(change) {
  if (change.type === "results") {
    if (change.loading) return "載入中";
    return change.count ? `${change.count} 個站` : "沒有符合的站";
  }
  if (change.type === "removed") return `已移除 ${change.label ?? ""}`.trim();
  return null;
}

export function buildSearchIndex(foodStations, metroStations = []) {
  const bySlug = new Map(metroStations.filter((station) => station.slug).map((station) => [station.slug, station]));
  return foodStations.map((food) => {
    const city = food.city === "shanghai" ? "shanghai" : "taipei";
    const metro = bySlug.get(food.slug);
    return {
      city,
      n: food.n,
      station: food.station,
      slug: food.slug,
      selectId: metro?.id ?? food.slug,
      nameEn: food.name_en || null,
      line: city === "taipei" && metro?.line ? metro.line : null,
      metroLines: city === "shanghai" ? [...(food.metro_lines ?? [])] : null,
      shops: (food.shops ?? []).flatMap((shop) => (shop?.name ? [{ name: shop.name, dish: shop.dish ?? null }] : [])),
    };
  }).sort((a, b) => a.n - b.n || a.station.localeCompare(b.station, "zh-Hant"));
}
