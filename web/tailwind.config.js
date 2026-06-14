/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#16202A",
        line: "#D9E2EC",
        brand: "#0F766E",
        accent: "#F59E0B"
      },
      boxShadow: {
        soft: "0 12px 32px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};
