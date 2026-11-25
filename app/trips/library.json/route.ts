import { threadPosts, postDate, postPath, sourceOnlyPosts } from "../../zh-tw/posts/content";
import { travelGuides, travelPath } from "../../zh-tw/travel/content";

import { getFoodStations, getShanghaiFoodStations } from "../../../lib/metro";
import { guideHeading } from "../../../lib/metro-guide.mjs";
import { guides, guidePath } from "../../zh-tw/guides/content";

export const dynamic = "force-static";

export function GET() {
  const items = [
    ...travelGuides.map(({ slug, region, city, title, date }) => ({
      kind: "guide", region, city, title, date, href: travelPath(slug),
    })),
    ...threadPosts.map(({ code, region, city, title, date, url }) => ({
      kind: "post", region, city, title, date, displayDate: postDate(date), href: postPath(code), source: url,
    })),
    ...sourceOnlyPosts.map(({ region, city, title, date, href, url }) => ({
      kind: "post", region, city, title, date, displayDate: postDate(date), href, source: url,
    })),
    ...[...getFoodStations(), ...getShanghaiFoodStations()].map(station => {
      const shanghai = station.city === "shanghai";
      return {
        kind: "guide", region: shanghai ? "中國" : "台灣", city: shanghai ? "上海" : "台北",
        title: guideHeading(station), date: station.date, href: `/metro/${station.slug}`,
      };
    }),
    ...guides.map(({ slug, title, updatedAt }) => ({
      kind: "guide", region: "Savvy App", city: "", title, date: updatedAt, href: guidePath(slug),
    })),
  ];
  return Response.json(items.sort((a, b) => b.date.localeCompare(a.date) || a.href.localeCompare(b.href)));
}
