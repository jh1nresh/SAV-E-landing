import editorial from "../../../lib/editorial.public.json";
import type { Metadata } from "next";
import { SITE_ORIGIN } from "../../../lib/site-content";

export const TRAVEL_ROOT = "/zh-tw/travel";
export const travelPath = (slug: string) => `${TRAVEL_ROOT}/${slug}`;

type Reference = { label: string; href: string };
type Paragraph = { text: string; links?: Reference[] };
type Comparison = { caption: string; columns: string[]; rows: string[][] };

export type TravelGuide = {
  slug: string;
  title: string;
  region: string;
  city: string;
  date: string;
  description: string;
  sections: { heading: string; paragraphs: Paragraph[]; table?: Comparison }[];
};

export const travelGuides = (editorial.travel as TravelGuide[]).slice()
  .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));

export function travelMetadata(title: string, description: string, path: string): Metadata {
  const url = new URL(path, SITE_ORIGIN).href;
  return {
    title: title + "｜Savvy",
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, locale: "zh_TW", type: path === TRAVEL_ROOT ? "website" : "article", images: ["/og.png"] },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  };
}
