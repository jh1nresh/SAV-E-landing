import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        paper: "#FFF9EB",
        ink: "#2F2E23",
        muted: "#62594F",
        forest: "#0E4A33",
        coral: "#F26B4A",
        kraft: "#EADDC6",
        line: "#DCCFB9",
        honey: "#FFCC4F",
      },
      fontFamily: {
        iansui: ["Iansui", "Caveat", "serif"],
        caveat: ["Caveat", "Iansui", "cursive"],
      },
    },
  },
  plugins: [],
};

export default config;
