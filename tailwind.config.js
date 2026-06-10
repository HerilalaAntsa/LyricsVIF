/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        projection: {
          bg: "#0E0E10",
          fg: "#F5F5F4",
          muted: "#71717A",
        },
      },
      fontFamily: {
        projection: ['"Inter"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
