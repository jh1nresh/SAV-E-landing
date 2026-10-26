import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/metro/index.html" }],
      afterFiles: [],
      fallback: [],
    };
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
