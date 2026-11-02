import { getFoodStations } from "../lib/metro";
import type { MetadataRoute } from "next";
import { GUIDE_ROOT, SITE_ORIGIN, guidePath, guides } from "./zh-tw/guides/content";

// Explicit public-content allowlist. Never derive entries from user/share data.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_ORIGIN}/` },
    ...["about", "contact", "privacy", "support", "docs"].map(path => ({ url: `${SITE_ORIGIN}/${path}` })),
    { url: `${SITE_ORIGIN}/metro` },
    ...getFoodStations().map(s => ({ url: `${SITE_ORIGIN}/metro/${s.slug}`, lastModified: s.date })),
    { url: `${SITE_ORIGIN}${GUIDE_ROOT}` },
    ...guides.map((guide) => ({ url: `${SITE_ORIGIN}${guidePath(guide.slug)}`, lastModified: guide.updatedAt })),
  ];
}
