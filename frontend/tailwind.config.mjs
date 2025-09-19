/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable dark mode via class strategy
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#5865F2', // Blurple base
          600: '#4957E8',    // Blurple hover
          700: '#3F4ED6',    // Blurple active
          100: '#C7D2FE',    // Blurple focus ring
        },
      },
    },
  },
  plugins: [],
};
