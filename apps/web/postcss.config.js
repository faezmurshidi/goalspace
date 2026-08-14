module.exports = {
  plugins: {
    // CSS nesting plugin must come before Tailwind
    'postcss-nesting': {
      // Configure nesting to ensure proper CSS nesting
      // See: https://tailwindcss.com/docs/using-with-preprocessors#nesting
      nesting: true
    },
    tailwindcss: {},
    autoprefixer: {},
  },
};
