export type RangeKey = '7d' | '30d' | 'term' | 'all' | 'custom';

/** The quick date ranges offered when downloading a report. "custom" is set by picking a date by hand. */
export const RANGE_PRESETS: { key: Exclude<RangeKey, 'custom'>; label: string }[] = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'term', label: 'This semester' },
  { key: 'all', label: 'All time' },
];

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** The Odd semester starts on 1 June and the Even semester on 1 January, as in the rest of the app. */
export function semesterStart(now: Date = new Date()): Date {
  return now.getMonth() >= 5 ? new Date(now.getFullYear(), 5, 1) : new Date(now.getFullYear(), 0, 1);
}

export function presetRange(key: Exclude<RangeKey, 'custom'>, now: Date = new Date()): { from: Date; to: Date } {
  const to = new Date(now);
  switch (key) {
    case '7d':
      return { from: startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)), to };
    case '30d':
      return { from: startOfDay(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000)), to };
    case 'term':
      return { from: semesterStart(now), to };
    case 'all':
      return { from: new Date(2020, 0, 1), to };
  }
}
