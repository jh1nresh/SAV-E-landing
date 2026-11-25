import { getFoodStations, getShanghaiFoodStations } from "../lib/metro";
import type { MetadataRoute } from "next";
import { GUIDE_ROOT, SITE_ORIGIN, guidePath, guides } from "./zh-tw/guides/content";
import { guideUpdatedAt } from "../lib/metro-guide.mjs";

import { travelGuides, travelPath, TRAVEL_ROOT } from "./zh-tw/travel/content";
import { threadPosts, postPath } from "./zh-tw/posts/content";

// Explicit public-content allowlist. Never derive entries from user/share data.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_ORIGIN}/` },
    { url: `${SITE_ORIGIN}/discover` },
    { url: `${SITE_ORIGIN}/shanghai` },
    ...["about", "contact", "privacy", "support", "docs"].map(path => ({ url: `${SITE_ORIGIN}/${path}` })),
    { url: `${SITE_ORIGIN}/metro` },
    ...[...getFoodStations(), ...getShanghaiFoodStations()].map(s => ({ url: `${SITE_ORIGIN}/metro/${s.slug}`, lastModified: guideUpdatedAt(s) })),
    { url: `${SITE_ORIGIN}${TRAVEL_ROOT}` },
    ...travelGuides.map(g => ({ url: SITE_ORIGIN + travelPath(g.slug), lastModified: g.date })),
    { url: SITE_ORIGIN + "/zh-tw/posts" },
    ...threadPosts.map(p => ({ url: SITE_ORIGIN + postPath(p.code), lastModified: p.date })),
    { url: `${SITE_ORIGIN}${GUIDE_ROOT}` },
    ...guides.map((guide) => ({ url: `${SITE_ORIGIN}${guidePath(guide.slug)}`, lastModified: guide.updatedAt })),
  ];
}
