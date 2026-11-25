import type { Metadata } from "next";
import editorial from "../../../lib/editorial.public.json";
import { getFoodStations, getShanghaiFoodStations } from "../../../lib/metro";
import { guideHeading } from "../../../lib/metro-guide.mjs";
import { SITE_ORIGIN } from "../../../lib/site-content";

export const POSTS_ROOT = "/zh-tw/posts";
export const postPath = (code: string) => `${POSTS_ROOT}/${encodeURIComponent(code)}`;

export type ThreadPost = {
  code: string;
  url: string;
  date: string;
  text: string;
  region: string;
  city: string;
  title: string;
  publishedExcerpt?: boolean;
};

export const threadPosts = [...(editorial.threads as ThreadPost[])].sort(
  (a, b) => b.date.localeCompare(a.date) || a.code.localeCompare(b.code),
);

// Reuse the source already published on the station guide. This also keeps
// links discoverable when there is no separate transcription of the post.
const sourcePattern = /^https:\/\/www\.threads\.com\/@savvysave_\/post\/([A-Za-z0-9_-]+)$/;

export const stationThreads = [...getFoodStations(), ...getShanghaiFoodStations()].flatMap(station => {
  const url = station.posts.threads;
  const match = url?.match(sourcePattern);
  return match && url ? [{
    code: match[1], url, title: guideHeading(station), href: `/metro/${station.slug}`, date: station.date,
    region: station.city === "shanghai" ? "中國" : "台灣",
    city: station.city === "shanghai" ? "上海" : "台北",
  }] : [];
});

const transcribed = new Set(threadPosts.map(({ code }) => code));
export const sourceOnlyPosts = [...new Map(stationThreads
  .filter(({ code }) => !transcribed.has(code))
  .map(item => [item.code, item])).values()];

const dateFormatter = new Intl.DateTimeFormat("zh-TW", {
  year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Taipei",
});

export function postDate(date: string) {
  return dateFormatter.format(new Date(date));
}

export function postMetadata(title: string, description: string, path: string): Metadata {
  const url = new URL(path, SITE_ORIGIN).href;
  return {
    title: title + "｜Savvy",
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: path === POSTS_ROOT ? "website" : "article", locale: "zh_TW" },
  };
}
