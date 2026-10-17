/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#FF5A36",
          50: "#FFF5F2",
          100: "#FFE6DE",
          200: "#FFC9B8",
          500: "#FF5A36",
          600: "#EB4523",
          700: "#C4341A",
        },
        ink: "#0F172A",
      },
    },
  },
  plugins: [],
};
