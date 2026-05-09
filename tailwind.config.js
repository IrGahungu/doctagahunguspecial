/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./ga-partners/**/*.{js,ts,jsx,tsx,mdx}", // Add this if ga-partners is a separate Next.js app or part of the main app
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};