/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,ts,jsx,tsx}", "./src/**/*.{js,ts,jsx,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#09090B",
        card: "#18181B",
        primary: "#3B82F6",
        destructive: "#EF4444",
        success: "#22C55E",
        "text-primary": "#FAFAFA",
        "text-secondary": "#A1A1AA",
        "text-muted": "#71717A",
        border: "#27272A",
      },
      borderRadius: {
        card: "12px",
        pill: "9999px",
      },
    },
  },
  plugins: [],
};
