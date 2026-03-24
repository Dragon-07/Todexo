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
        background: "var(--background)",
        surface: "var(--surface)",
        surfaceContainer: "var(--surface-container)",
        surfaceContainerHigh: "var(--surface-container-high)",
        surfaceVariant: "var(--surface-variant)",
        primary: {
          DEFAULT: "var(--primary)",
          dim: "var(--primary-dim)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
        },
        tertiary: {
          DEFAULT: "var(--tertiary)",
        },
        onSurface: "var(--on-surface)",
        onSurfaceVariant: "var(--on-surface-variant)",
        onError: "var(--on-error)",
      },
      fontFamily: {
        sans: ['var(--font-inter)'],
      },
    },
  },
  plugins: [],
};
export default config;
