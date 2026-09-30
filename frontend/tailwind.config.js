/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        category: {
          mind: '#6366f1',
          body: '#10b981',
          career: '#f59e0b',
          money: '#059669',
          life: '#ec4899',
          discipline: '#8b5cf6',
        }
      }
    },
  },
  plugins: [],
}
