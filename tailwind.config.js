const c = require('./constants/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  // Each weight of the app font is its own file, so font-bold etc. pick a font family (below), not a weight
  corePlugins: { fontWeight: false },
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: c.primary, soft: c.primarySoft },
        navy: { DEFAULT: c.navy, soft: c.navySoft },
        gold: { DEFAULT: c.gold, bg: c.goldBg },
        secondary: c.muted,
        accent: c.gold,
        success: { DEFAULT: c.success, bg: c.successBg },
        warning: { DEFAULT: c.warning, bg: c.warningBg },
        danger: { DEFAULT: c.danger, bg: c.dangerBg },
        info: { DEFAULT: c.info, bg: c.infoBg },
        light: {
          DEFAULT: c.bg,
          card: c.card,
          border: c.border,
          muted: c.muted,
          subtle: c.subtle,
          text: c.text,
          primaryBg: c.primaryBg,
        },
      },
      fontFamily: {
        sans: ['PlusJakartaSans_400Regular'],
        regular: ['PlusJakartaSans_400Regular'],
        normal: ['PlusJakartaSans_400Regular'],
        medium: ['PlusJakartaSans_500Medium'],
        semibold: ['PlusJakartaSans_600SemiBold'],
        bold: ['PlusJakartaSans_700Bold'],
        extrabold: ['PlusJakartaSans_800ExtraBold'],
        black: ['PlusJakartaSans_800ExtraBold'],
      },
    },
  },
  plugins: [],
};
