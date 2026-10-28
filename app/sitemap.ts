import type { MetadataRoute } from "next";
import { GUIDE_ROOT, SITE_ORIGIN, guidePath, guides } from "./zh-tw/guides/content";

// Explicit public-content allowlist. Never derive entries from user/share data.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_ORIGIN}/` },
    { url: `${SITE_ORIGIN}${GUIDE_ROOT}` },
    ...guides.map((guide) => ({ url: `${SITE_ORIGIN}${guidePath(guide.slug)}`, lastModified: guide.updatedAt })),
  ];
}
