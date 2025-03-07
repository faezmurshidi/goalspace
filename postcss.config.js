module.exports = {
  plugins: {
    // CSS nesting plugin must come before Tailwind
    'postcss-nesting': {},
    tailwindcss: {},
    autoprefixer: {},
  },
};
