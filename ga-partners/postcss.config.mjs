// postcss.config.mjs
export default {
  plugins: {
    "@tailwindcss/postcss": {}, // adapter required for tailwind v4
    autoprefixer: {},
  },
};
