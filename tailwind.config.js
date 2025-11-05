/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Gabarito', 'sans-serif'],
      },
      colors: {
        'brand-dark': '#2B2B2B',
        'brand-light': '#F5F5F5',
      },
      boxShadow: {
        'neo': '6px 6px 0px #2B2B2B',
        'neo-sm': '3px 3px 0px #2B2B2B',
      }
    }
  },
  plugins: [],
}