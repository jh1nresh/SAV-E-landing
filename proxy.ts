import { NextRequest, NextResponse } from "next/server";
import { negotiate } from "./lib/negotiate.mjs";
import { publicProblem } from "./lib/public-api";
import { llmsText, markdownFor, notFoundMarkdown } from "./lib/markdown";

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/api/public" || path.startsWith("/api/public/")) {
    if (path !== "/api/public/content") {
      const result = publicProblem(404, "endpoint_not_found", "This public API route does not exist.",
        "Use one of the routes listed in /openapi.json.");
      return request.method === "HEAD" ? new Response(null, { status: result.status, headers: result.headers }) : result;
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      return publicProblem(405, "method_not_allowed", "This endpoint only reads public content.",
        "Use GET with the path query parameter.", { Allow: "GET, HEAD, OPTIONS" });
    }
    return NextResponse.next();
  }
  if (!["GET", "HEAD"].includes(request.method)) return NextResponse.next();
  // Leave Next's transport and fixed-format resources to their existing handlers.
  if (request.headers.has("rsc") || ["/BingSiteAuth.xml", "/robots.txt", "/sitemap.xml", "/openapi.json", "/icon.png", "/og.png"].includes(path)) return NextResponse.next();
  const respond = (body: string, status: number, type = "text/markdown") => new NextResponse(request.method === "HEAD" ? null : body, {
    status, headers: { "Content-Type": `${type}; charset=utf-8`, "Vary": "Accept", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Link": '</llms.txt>; rel="describedby"' },
  });
  if (path === "/llms.txt") return respond(llmsText, 200, "text/plain");
  const explicit = path.endsWith(".md");
  const format = explicit ? "markdown" : negotiate(request.headers.get("accept"));
  if (format === null) return respond("Available representations: text/html and text/markdown.\n", 406, "text/plain");
  if (format === "markdown") {
    const canonicalPath = path === "/index.md" ? "/" : explicit ? path.slice(0, -3) : path;
    const body = markdownFor(canonicalPath.replace(/\/$/, "") || "/");
    return respond(body ?? notFoundMarkdown, body ? 200 : 404);
  }
  const response = NextResponse.next();
  response.headers.set("Vary", "Accept");
  // Next's App Router overwrites Vary on HTML. Prevent representation reuse
  // even on clients/CDNs that do not retain our Accept variation.
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Link", '</llms.txt>; rel="describedby"');
  return response;
}

export const config = { matcher: ["/((?!_next/|assets/|metro/images/|trips/).*)"] };
