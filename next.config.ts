import type { NextConfig } from "next";
import editorial from "./lib/editorial.public.json";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Playwright loads the dev server at 127.0.0.1. Next only allows localhost
  // unless this is set, and a blocked origin never hydrates client components.
  allowedDevOrigins: ["127.0.0.1"],
  // Next's built-in slash redirect is a priority 308 from /taipei/ to /taipei.
  // Skip it so the Taipei rule below can 301 /taipei and /taipei/ straight to /metro.
  skipTrailingSlashRedirect: true,
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      // Keep shared Threads-code URLs working while indexing only readable URLs.
      // Explicit Markdown aliases must redirect before content negotiation too.
      ...editorial.threads.flatMap(({ code, slug }) => ["", ".md"].flatMap(format =>
        ["", "/"].map(slash => ({
          source: `/zh-tw/posts/${code}${format}${slash}`,
          destination: `/zh-tw/posts/${slug}${format}`,
          permanent: true,
        })),
      )),
      ...["", ".md"].flatMap(format => ["", "/"].map(slash => ({
        source: `/discover${format}${slash}`,
        destination: `/metro${format}`,
        permanent: true,
      }))),
      // Old city links still land on the map now that / serves the workspace.
      { source: "/", has: [{ type: "query", key: "city", value: "(?:taipei|shanghai)" }], destination: "/metro", permanent: true },
      { source: "/trips/index.html", destination: "/", permanent: true },
      { source: "/taipei", destination: "/metro", statusCode: 301 },
      { source: "/taipei.md", destination: "/metro.md", statusCode: 301 },
      // Same slash cleanup the framework used to do, after the Taipei rules.
      { source: "/:path+/", destination: "/:path+", permanent: true },
    ];
  },
};

export default nextConfig;
