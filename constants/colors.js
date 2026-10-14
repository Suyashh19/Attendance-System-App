// The app palette. Tailwind (tailwind.config.js) and code (constants/theme.ts) both read from here.
// `navy` is the dark surface colour (now an ink violet) and `gold` the accent (now coral).
module.exports = {
  navy: '#17132B',
  navySoft: '#2B2550',
  // The far end of the hero gradient, which starts at `navy`
  heroEnd: '#3A2196',
  primary: '#6D3BF5',
  primarySoft: '#8E66FF',
  primaryBg: '#F1ECFF',
  gold: '#F9603B',
  goldBg: '#FFF0EA',

  text: '#17132B',
  muted: '#625D75',
  subtle: '#9C98AD',
  border: '#E8E5F0',
  bg: '#F7F6FB',
  card: '#FFFFFF',
  white: '#FFFFFF',
  overlay: 'rgba(23, 19, 43, 0.55)',

  success: '#0B815A',
  successBg: '#E6F6EF',
  warning: '#B45309',
  warningBg: '#FEF3E2',
  danger: '#D92D20',
  dangerBg: '#FEECEA',
};
