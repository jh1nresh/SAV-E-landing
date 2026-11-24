import { threadPosts, postPath } from "../../zh-tw/posts/content";
import { travelGuides, travelPath } from "../../zh-tw/travel/content";

export const dynamic = "force-static";

export function GET() {
  const items = [
    ...travelGuides.map(({ slug, region, city, title, date }) => ({
      kind: "guide", region, city, title, date, href: travelPath(slug),
    })),
    ...threadPosts.map(({ code, region, city, title, date }) => ({
      kind: "post", region, city, title, date, href: postPath(code),
    })),
  ];
  return Response.json(items.sort((a, b) => b.date.localeCompare(a.date) || a.href.localeCompare(b.href)));
}
