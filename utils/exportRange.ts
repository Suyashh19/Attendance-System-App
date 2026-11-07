import { getSemesterCalendar } from './academicYear';

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

/** The first day of the latest semester to have started, by the semester months in Settings. */
export function semesterStart(now: Date = new Date()): Date {
  const { oddStart, evenStart } = getSemesterCalendar();
  const starts: Date[] = [];
  for (const year of [now.getFullYear() - 1, now.getFullYear()]) {
    starts.push(new Date(year, oddStart - 1, 1), new Date(year, evenStart - 1, 1));
  }
  const begun = starts.filter((d) => d.getTime() <= now.getTime());
  return begun.sort((a, b) => b.getTime() - a.getTime())[0];
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
