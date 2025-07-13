@type {import('tailwindcss').Config}
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      // ✅ Aquí añadimos la nueva familia de fuentes
      fontFamily: {
        'cinzel-decorative': ['"Cinzel Decorative"', 'serif'],
      },
    },
  },
  plugins: [],
}