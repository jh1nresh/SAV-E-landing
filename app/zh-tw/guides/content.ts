import type { Metadata } from "next";
import entries from "../../../data/guides.json";

export const SITE_ORIGIN = "https://sav-e-landing.vercel.app";
export const GUIDE_ROOT = "/zh-tw/guides";
export const guides = entries;
export const guidePath = (slug: string) => `${GUIDE_ROOT}/${slug}`;

export function guideMetadata(title: string, description: string, path: string): Metadata {
  const url = `${SITE_ORIGIN}${path}`;
  return {
    title, description,
    alternates: { canonical: url },
    openGraph: { title, description, url, locale: "zh_TW", type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}
