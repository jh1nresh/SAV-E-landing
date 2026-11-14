import shanghaiLines from "../../content/metro/shanghai-lines.json";
import type { FoodStation, MetroData } from "../../lib/metro";
import { MAP_SVG } from "./map-svg";

// Fit the published Shanghai schematic into the existing hero camera's view units.
const point = ([x, y]: [number, number]): [number, number] => [x * .72 - 60, y * .72 - 40];
export function shanghaiMetro(stations: FoodStation[]): MetroData {
  return {
    _meta: { city: "shanghai", asOf: stations.map(s => s.date).sort().at(-1) ?? "" },
    stations: stations.map(s => ({
      id: s.slug, slug: s.slug, order: s.n, name: s.station,
      line: (s.metro_lines ?? []).map(n => `${n} 號線`).join("、"),
      status: "live", updatedAt: s.date,
      mapPos: { line: s.map.line, at: point(s.map.snapped ?? s.map.at),
        labelOffset: s.map.labelOffset?.map(n => n * .72) as [number, number] | undefined },
    })),
    stores: stations.flatMap(s => s.shops.map((shop, i) => ({
      id: `${s.slug}-${shop.key ?? i}`, kind: "post" as const, stationId: s.slug,
      name: shop.name ?? "", article: shop, priceFrom: false, priceCheckedAt: null,
      exit: null, verified: false, addedAt: s.date, image: s.images.photos.find(path => path.split("/").at(-1)?.replace(/\.[^.]+$/, "") === shop.key),
      imageAi: false as const,
      sourcePosts: [
        ...(s.posts.instagram ? [{ platform: "ig" as const, url: s.posts.instagram, date: s.date }] : []),
        ...(s.posts.threads ? [{ platform: "threads" as const, url: s.posts.threads, date: s.date }] : []),
        ...(s.posts.xiaohongshu ? [{ platform: "xhs" as const, url: s.posts.xiaohongshu, date: s.date }] : []),
      ],
    }))),
  };
}

export function cityMapSvg(data: MetroData): string {
  if (data._meta.city !== "shanghai") return MAP_SVG;
  return `<svg id="mapsvg" viewBox="-150 -170 1000 940" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="上海地鐵手繪示意地圖。位置為示意，不是精確地理座標。"><g transform="translate(-60 -40) scale(.72)" fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#wobS)">${Object.entries(shanghaiLines.lines).map(([id, line]) => `<path d="${line.d}" stroke="#fff9eb" stroke-width="16"/><path id="${id}" d="${line.d}" stroke="${line.color}" stroke-width="8"/>`).join("")}</g><g id="stdots"></g></svg>`;
}
export const cityMapName = (data: MetroData) => data._meta.city === "shanghai" ? "Shanghai" : "Taipei";
