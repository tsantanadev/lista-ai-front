/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,ts,jsx,tsx}', './src/**/*.{js,ts,jsx,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#111210',
        surface: '#1A1C1A',
        border: '#0F2E28',
        'progress-track': '#222420',
        primary: '#1D9E75',
        'primary-dark': '#0F6E56',
        accent: '#EF9F27',
        neutral: '#888780',
        'text-primary': '#EEF2F0',
        destructive: '#EF4444',
      },
      borderRadius: {
        card: '12px',
        sheet: '20px',
      },
    },
  },
  plugins: [],
};
