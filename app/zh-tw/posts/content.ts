import type { Metadata } from "next";
import editorial from "../../../lib/editorial.public.json";
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
