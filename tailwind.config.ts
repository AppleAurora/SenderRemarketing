import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101828",
        muted: "#667085",
        brand: { DEFAULT: "#635BFF", dark: "#5148E5", soft: "#F0EFFF" },
      },
      boxShadow: { panel: "0 2px 12px rgba(16,24,40,.04)" },
    },
  },
  plugins: [],
};

export default config;
