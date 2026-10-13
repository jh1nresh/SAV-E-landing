import type { Config } from "tailwindcss";

/** Light `SaveAtlasPalette` from SAV-E/Extensions/Color+Theme.swift */
const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#FDF8F3",
        paper: "#FFFDF7",
        forest: "#0E4A33",
        ink: "#2E2117",
        muted: "#62594F",
        coral: "#F26B4A",
        mint: "#D6E8C4",
        sky: "#B5E3F5",
        lavender: "#E3D6F7",
        kraft: "#F0CFA1",
        honey: "#FFCC4F",
        line: "#A68F78",
      },
      fontFamily: {
        atlas: [
          "ui-rounded",
          "SF Pro Rounded",
          "Hiragino Maru Gothic ProN",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
      },
      borderRadius: {
        chip: "14px",
        card: "18px",
        panel: "22px",
      },
      boxShadow: {
        atlas: "0 5px 12px rgba(46, 33, 23, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
