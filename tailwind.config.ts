import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: "#DEDBC8",
      },
      fontFamily: {
        serif: ['"Instrument Serif"', "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
