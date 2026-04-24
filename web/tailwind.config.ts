import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1456F0",
          hover: "#0E46D4",
          light: "#F0F4FF",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          secondary: "#F7F8FA",
        },
        border: {
          DEFAULT: "#E4E6EB",
        },
        text: {
          primary: "#1F2329",
          secondary: "#646A73",
          muted: "#8F959E",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "PingFang SC",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
      },
    },
  },
  plugins: [typography],
};

export default config;
