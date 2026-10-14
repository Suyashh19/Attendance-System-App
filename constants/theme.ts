import palette from './colors';

export const colors = palette;

/** The app typeface, one family name per weight (loaded in app/_layout.tsx). */
export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

/** Soft shadows. `card` for surfaces resting on the page, `raised` for sheets and bars. */
export const shadow = {
  card: {
    shadowColor: palette.navy,
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  raised: {
    shadowColor: palette.navy,
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
  glow: {
    shadowColor: palette.primary,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

export function initials(name?: string | null) {
  const parts = (name || '?').trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

// Students need this share of classes to stay eligible
export const MIN_ATTENDANCE_PERCENT = 75;

type StatusTone = { text: string; bg: string; icon: 'checkmark-circle' | 'close-circle' | 'warning' | 'time' };

/** Colours and icon for an attendance or enrollment status. */
export function statusTone(status: string): StatusTone {
  switch (status) {
    case 'PRESENT':
    case 'APPROVED':
      return { text: colors.success, bg: colors.successBg, icon: 'checkmark-circle' };
    case 'ABSENT':
    case 'REJECTED':
      return { text: colors.danger, bg: colors.dangerBg, icon: 'close-circle' };
    case 'PENDING':
      return { text: colors.warning, bg: colors.warningBg, icon: 'time' };
    default:
      return { text: colors.warning, bg: colors.warningBg, icon: 'warning' };
  }
}

/** Classes a student must attend in a row to get back to the minimum percentage. */
export function classesNeeded(present: number, total: number): number {
  const min = MIN_ATTENDANCE_PERCENT / 100;
  if (total === 0 || present / total >= min) return 0;
  return Math.ceil((min * total - present) / (1 - min));
}
