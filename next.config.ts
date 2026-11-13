import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Playwright loads the dev server at 127.0.0.1. Next only allows localhost
  // unless this is set, and a blocked origin never hydrates client components.
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
