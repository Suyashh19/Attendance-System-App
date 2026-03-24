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
        secondary: '#8B5CF6',
        accent: '#06B6D4',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        dark: {
          DEFAULT: '#0F172A',
          card: '#1E293B',
          border: '#334155',
          muted: '#64748B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui'],
      },
    },
  },
  plugins: [],
};
