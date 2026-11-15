/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#0B0F14",
          surface: "#121821",
          raised: "#18202B",
          border: "#243042",
          text: "#E6EDF3",
          muted: "#8B98A9",
          accent: "#2DD4BF"
        },
        group: {
          a: "#38BDF8", // Sky blue
          b: "#F59E0B", // Amber
          c: "#A78BFA", // Soft violet
          d: "#34D399"  // Emerald
        }
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"]
      }
    }
  },
  plugins: []
};
