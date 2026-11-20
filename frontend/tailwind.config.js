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
          bg: "#F8FAFC",
          surface: "#FFFFFF",
          raised: "#F1F5F9",
          border: "#E2E8F0",
          text: "#0F172A",
          muted: "#64748B",
          accent: "#0284C7",
          accentLight: "#E0F2FE"
        },
        group: {
          a: "#0284C7", // Sky blue
          b: "#F59E0B", // Amber
          c: "#8B5CF6", // Violet
          d: "#10B981"  // Emerald
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

