import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Direct matching to baari-app/lib/theme.ts Colors object
        white: "#FFFFFF",
        offWhite: "#F4F6F9",
        "white-dark": "#F4F6F9",
        "white-off": "#F4F6F9",

        black: "#1A1A1A",
        grayBlack: "#5C5F66",
        "black-light": "#5C5F66",
        nearBlack: "#0A0A0A",
        "black-dark": "#0A0A0A",

        navy: "#0A2540",
        mutedNavy: "#3C4E7A",
        "navy-light": "#3C4E7A",
        deepNavy: "#061729",
        "navy-dark": "#061729",

        sky: "#5AC8FA",
        paleSky: "#DCEEF7",
        "sky-light": "#DCEEF7",
        deepSky: "#2E93C4",
        "sky-dark": "#2E93C4",

        border: "#E2E8F0",
        borderDark: "#0A2540",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
      fontSize: {
        // Direct matching to baari-app/lib/theme.ts Typography object
        display: ["28px", { lineHeight: "34px", fontWeight: "700" }],
        h1: ["22px", { lineHeight: "28px", fontWeight: "600" }],
        h2: ["18px", { lineHeight: "24px", fontWeight: "600" }],
        body: ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "body-medium": ["16px", { lineHeight: "24px", fontWeight: "500" }],
        "body-small": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "body-small-medium": ["14px", { lineHeight: "20px", fontWeight: "500" }],
        caption: ["12px", { lineHeight: "16px", fontWeight: "500" }],
      },
      borderRadius: {
        // Direct matching to baari-app/lib/theme.ts BorderRadius object
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
        full: "9999px",
      },
      boxShadow: {
        // elevated card shadow matching baari-app/components/ui/Card.tsx
        card: "0 2px 8px rgba(6, 23, 41, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
