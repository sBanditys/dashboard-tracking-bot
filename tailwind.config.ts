import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "#1a1a1a",
          light: "#ffffff",
        },
        surface: {
          DEFAULT: "#2d2d2d",
          light: "#f5f5f5",
        },
        accent: {
          purple: "#8B5CF6",
        },
        border: {
          DEFAULT: "#404040",
          light: "#e5e5e5",
        },
      },
    },
  },
  plugins: [],
};
export default config;
