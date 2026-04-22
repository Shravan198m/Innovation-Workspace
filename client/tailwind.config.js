/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#4F46E5",
          hover: "#6366F1",
          tint: "#E0E7FF",
        },
        neutral: {
          ink: "#0F172A",
          surface: "#F8FAFC",
          muted: "#64748B",
          base: "#FFFFFF",
        },
        primary: "#4F46E5",
        secondary: "#6366F1",
        accent: "#E0E7FF",
        dark: "#0F172A",
        light: "#F8FAFC",
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
      },
    },
  },
  plugins: [],
};
