/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Modern Storybook Palette
        navy: {
          50: "#EEF2F9",
          100: "#D9E2F1",
          200: "#B3C5E4",
          700: "#1E3A6E",
          800: "#172B54",
          900: "#0F1E3D",
          950: "#0A142A",
        },
        gold: {
          50: "#FEF3C7",
          100: "#FDE68A",
          200: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
        },
        sky: {
          50: "#E0F2FE",
          100: "#BAE6FD",
          200: "#7DD3FC",
          400: "#38BDF8",
          500: "#0EA5E9",
          600: "#0284C7",
          700: "#0369A1",
        },
        paper: {
          50: "#FFFDF9",
          100: "#FFFBF2", // Warm Storybook Paper background
          200: "#F6EEDB",
          300: "#EAE2D3", // Warm borders
        },
        ink: {
          50: "#F8FAFC",
          100: "#E2E8F0",
          200: "#CBD5E1",
          300: "#94A3B8",
          400: "#64748B",
          500: "#475569",
          600: "#334155",
          700: "#1E293B",
          800: "#172B54",
          900: "#0F1E3D",
        },
        emerald: {
          50: "#D1FAE5",
          100: "#A7F3D0",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
        },
        teal: {
          50: "#EFFCF6",
          100: "#D1FAE5",
          600: "#10B981",
          700: "#059669",
          800: "#047857",
        },
        warn: { 50: "#FFFBEB", 700: "#B45309" },
        danger: { 50: "#FEF2F2", 600: "#DC2626", 700: "#B91C1C" },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "ui-sans-serif", "system-ui", "-apple-system", '"Segoe UI"', "sans-serif"],
        display: ['"Fredoka"', '"Plus Jakarta Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
        fredoka: ['"Fredoka"', "cursive", "sans-serif"],
      },
      boxShadow: {
        storybook: "0 4px 20px -2px rgba(15, 30, 61, 0.08), 0 2px 6px -1px rgba(15, 30, 61, 0.04)",
        "storybook-hover": "0 12px 32px -4px rgba(15, 30, 61, 0.12), 0 4px 12px -2px rgba(15, 30, 61, 0.08)",
        "glow-gold": "0 0 24px -2px rgba(245, 158, 11, 0.4)",
        "glow-sky": "0 0 24px -2px rgba(14, 165, 233, 0.4)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};
