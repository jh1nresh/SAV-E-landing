import { canonicalPostPath } from "../../../zh-tw/posts/content";
import { markdownFor } from "../../../../lib/markdown";
import { publicPathPattern, publicProblem } from "../../../../lib/public-api";
import { SITE_ORIGIN } from "../../../../lib/site-content";

export function GET(request: Request) {
  const paths = new URL(request.url).searchParams.getAll("path");
  const [path] = paths;
  if (paths.length !== 1 || path.length > 300 || !publicPathPattern.test(path)) {
    return publicProblem(400, "invalid_path", "Supply one canonical website path.",
      "Use a relative path from /sitemap.xml, for example /zh-tw/travel, without a query or fragment.");
  }

  const canonical = path === "/discover" ? "/metro" : canonicalPostPath(path);
  const markdown = markdownFor(canonical);
  if (markdown === null) {
    return publicProblem(404, "content_not_found", "There is no public document at this path.",
      "Find available canonical paths in /sitemap.xml or the public guide catalog at /trips/library.json.");
  }

  return Response.json({ url: SITE_ORIGIN + canonical, markdown }, {
    headers: { "Cache-Control": "no-store" },
  });
}
