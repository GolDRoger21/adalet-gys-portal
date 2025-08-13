/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./**/*.{html,js}", "./_templates/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        primary: '#0d9488', // style.css'teki --primary-color
        secondary: '#475569', // --secondary-color
        accent: '#f59e0b', // --accent-color
        danger: '#dc2626', // --danger-color
        background: '#f1f5f9', // --background-color
        surface: '#ffffff', // --surface-color
        text: '#1e293b', // --text-color
        border: '#e2e8f0' // --border-color
      },
      fill: {
        primary: '#0d9488',
        secondary: '#475569',
        accent: '#f59e0b',
        danger: '#dc2626',
        none: 'none'
      },
      stroke: {
        primary: '#0d9488',
        secondary: '#475569',
        accent: '#f59e0b',
        danger: '#dc2626'
      }
    }
  },
  plugins: []
};
