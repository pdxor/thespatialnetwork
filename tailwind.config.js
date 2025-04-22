/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Custom colors for dark mode
        'dark-primary': '#0F172A',
        'dark-secondary': '#1E293B',
        'dark-accent': '#0EA5E9',
        'dark-text': '#E2E8F0',
        'dark-muted': '#94A3B8',
        'dark-border': '#334155',
        'dark-card': '#1E293B',
        'dark-hover': '#334155',
      },
      boxShadow: {
        'dark-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.5)',
        'dark-md': '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.5)',
        'dark-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
};