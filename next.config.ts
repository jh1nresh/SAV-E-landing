import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Playwright loads the dev server at 127.0.0.1. Next only allows localhost
  // unless this is set, and a blocked origin never hydrates client components.
  allowedDevOrigins: ["127.0.0.1"],
  // Next's built-in slash redirect is a priority 308 from /taipei/ to /taipei.
  // Skip it so the Taipei rule below can 301 /taipei and /taipei/ straight to /discover.
  skipTrailingSlashRedirect: true,
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      // Old city links still land on the map now that / serves the workspace.
      { source: "/", has: [{ type: "query", key: "city", value: "taipei|shanghai" }], destination: "/discover", permanent: true },
      { source: "/trips/index.html", destination: "/", permanent: true },
      { source: "/taipei", destination: "/discover", statusCode: 301 },
      { source: "/taipei.md", destination: "/discover.md", statusCode: 301 },
      // Same slash cleanup the framework used to do, after the Taipei rules.
      { source: "/:path+/", destination: "/:path+", permanent: true },
    ];
  },
};

export default nextConfig;
