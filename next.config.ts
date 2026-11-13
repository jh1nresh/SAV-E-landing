import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Playwright loads the dev server at 127.0.0.1. Next only allows localhost
  // unless this is set, and a blocked origin never hydrates client components.
  allowedDevOrigins: ["127.0.0.1"],
  // Next's built-in slash redirect is a priority 308 from /taipei/ to /taipei.
  // Skip it so the Taipei rule below can 301 /taipei and /taipei/ straight to /.
  skipTrailingSlashRedirect: true,
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      { source: "/taipei", destination: "/", statusCode: 301 },
      { source: "/taipei.md", destination: "/index.md", statusCode: 301 },
      // Same slash cleanup the framework used to do, after the Taipei rules.
      { source: "/:path+/", destination: "/:path+", permanent: true },
    ];
  },
};

export default nextConfig;
