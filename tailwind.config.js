/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./{app,components,libs,pages,hooks}/**/*.{html,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        serif: ['"Playfair Display"', 'serif'],
        handwriting: ['Pacifico', 'cursive'],
      },
      colors: {
        // Logo-sourced palette: hot-pink AWC letters on deep plum base.
        brand: {
          DEFAULT: '#ec4899', // pink-500 — primary CTA / accents
          light: '#f472b6',   // pink-400 — hover / highlight
          dark: '#be185d',    // pink-700 — pressed / borders
          accent: '#f9a8d4',  // pink-300 — soft highlight
          muted: '#fbcfe8',   // pink-200 — backgrounds
          deep: '#581c87',    // purple-900 — dark surfaces (footer, hero overlays)
          deeper: '#3b0764',  // purple-950 — deepest plum (logo base)
        },
      },
    },
  },
  plugins: [],
}

