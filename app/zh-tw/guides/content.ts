import type { Metadata } from "next";
import entries from "../../../data/guides.json";

import { SITE_ORIGIN } from "../../../lib/site-content";
export { SITE_ORIGIN };
export const GUIDE_ROOT = "/zh-tw/guides";
export const guides = entries;
export const guidePath = (slug: string) => `${GUIDE_ROOT}/${slug}`;

export function guideMetadata(title: string, description: string, path: string): Metadata {
  const url = `${SITE_ORIGIN}${path}`;
  return {
    title, description,
    alternates: { canonical: url, types: { "text/markdown": `${url}.md` } },
    openGraph: { title, description, url, locale: "zh_TW", type: "website", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Savvy" }] },
    twitter: { card: "summary_large_image", title, description },
  };
}
