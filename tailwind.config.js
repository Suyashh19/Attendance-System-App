/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#6366F1',
        secondary: '#6B7280',
        accent: '#6366F1',
        success: '#059669',
        warning: '#6B7280',
        danger: '#1A1D1F',
        light: {
          DEFAULT: '#F7F9FC',
          card: '#FFFFFF',
          border: '#E5EAF2',
          muted: '#6B7280',
          text: '#1A1D1F',
          primaryBg: '#EEF2FF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui'],
      },
    },
  },
  plugins: [],
};
