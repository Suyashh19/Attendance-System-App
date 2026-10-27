/** `excused` = every class that day was excused by approved leave */
export type DayState = 'present' | 'absent' | 'mixed' | 'excused';

export interface CalendarSubject {
  name: string;
  records: { date: string; status: string }[];
}

export interface DayEntry {
  subject: string;
  status: string;
}

export interface DayInfo {
  state: DayState;
  entries: DayEntry[];
}

export interface DateRange {
  start: Date;
  end: Date;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** A local calendar date as YYYY-MM-DD, the key used for every day. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * The dates a semester scope covers: Odd is 1 June to 31 December, Even is 1 January to 31 May of the following
 * year, and a bare academic year is the two together. "All time" and "Other" have no single range.
 */
export function semesterRange(scopeKey: string): DateRange | null {
  const match = /^(\d{4})-\d{2}(?: (Odd|Even))?$/.exec(scopeKey);
  if (!match) return null;

  const startYear = Number(match[1]);
  if (match[2] === 'Odd') return { start: new Date(startYear, 5, 1), end: new Date(startYear, 11, 31) };
  if (match[2] === 'Even') return { start: new Date(startYear + 1, 0, 1), end: new Date(startYear + 1, 4, 31) };
  return { start: new Date(startYear, 5, 1), end: new Date(startYear + 1, 4, 31) };
}

/** Every class record of the chosen subjects grouped by day, with the day's overall state. */
export function buildDayMap(subjects: CalendarSubject[], range: DateRange): Map<string, DayInfo> {
  const first = startOfDay(range.start).getTime();
  const last = startOfDay(range.end).getTime();
  const map = new Map<string, DayInfo>();

  for (const subject of subjects) {
    for (const record of subject.records) {
      const date = new Date(record.date);
      if (isNaN(date.getTime())) continue;
      const time = startOfDay(date).getTime();
      if (time < first || time > last) continue;

      const key = dayKey(date);
      const day = map.get(key) ?? { state: 'present' as DayState, entries: [] };
      day.entries.push({ subject: subject.name, status: record.status });
      map.set(key, day);
    }
  }

  for (const day of map.values()) {
    // Excused classes are not held against the student, so the day is judged on the others
    const counted = day.entries.filter((e) => e.status !== 'EXCUSED');
    const present = counted.filter((e) => e.status === 'PRESENT').length;
    day.state =
      counted.length === 0 ? 'excused' : present === counted.length ? 'present' : present === 0 ? 'absent' : 'mixed';
  }
  return map;
}

export interface CalendarCell {
  key: string;
  date: Date;
  /** Inside the semester; days of the first and last week that fall outside it are left blank */
  inRange: boolean;
}

/** The semester as columns of weeks, Monday first. */
export function buildWeeks(range: DateRange): CalendarCell[][] {
  const first = startOfDay(range.start);
  const last = startOfDay(range.end);

  const cursor = new Date(first);
  cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7)); // back to Monday

  const weeks: CalendarCell[][] = [];
  while (cursor.getTime() <= last.getTime()) {
    const week: CalendarCell[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(cursor);
      week.push({
        key: dayKey(date),
        date,
        inRange: date.getTime() >= first.getTime() && date.getTime() <= last.getTime(),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

/** Where a month name goes: the column of the first week that starts in a new month. */
export function monthLabels(weeks: CalendarCell[][]): { index: number; label: string }[] {
  const labels: { index: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, index) => {
    const cell = week.find((c) => c.inRange);
    if (!cell) return;
    const month = cell.date.getMonth();
    if (month !== lastMonth) {
      labels.push({ index, label: cell.date.toLocaleString('en-US', { month: 'short' }) });
      lastMonth = month;
    }
  });
  return labels;
}

/** The column to open on: this week, or the last week with a class when the semester is over. */
export function startingWeek(weeks: CalendarCell[][], dayMap: Map<string, DayInfo>, now: Date = new Date()): number {
  const todayKey = dayKey(now);
  const current = weeks.findIndex((w) => w.some((c) => c.key === todayKey));
  if (current >= 0) return current;

  for (let i = weeks.length - 1; i >= 0; i--) {
    if (weeks[i].some((c) => dayMap.has(c.key))) return i;
  }
  return 0;
}

export interface Streaks {
  current: number;
  best: number;
}

/**
 * Runs of class days where the student was present in every class. Days without a class, and days excused by
 * approved leave, neither extend nor break a run; a day with any missed class ends it.
 */
export function streaks(dayMap: Map<string, DayInfo>): Streaks {
  const days = [...dayMap.entries()].sort(([a], [b]) => a.localeCompare(b));

  let best = 0;
  let run = 0;
  for (const [, day] of days) {
    if (day.state === 'excused') continue;
    run = day.state === 'present' ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return { current: run, best };
}

export interface WeekdayInsight {
  weekday: string;
  missed: number;
  total: number;
}

const MIN_CLASSES_FOR_INSIGHT = 8;
const MIN_MISSED_FOR_INSIGHT = 3;
const MIN_GAP_OVER_AVERAGE = 0.15;

/** The weekday the student misses clearly more than others, or null when there is no real pattern. */
export function weekdayInsight(dayMap: Map<string, DayInfo>): WeekdayInsight | null {
  const total = new Array(7).fill(0);
  const missed = new Array(7).fill(0);

  for (const [key, day] of dayMap) {
    const [y, m, d] = key.split('-').map(Number);
    const weekday = new Date(y, m - 1, d).getDay();
    for (const entry of day.entries) {
      if (entry.status === 'EXCUSED') continue;
      total[weekday] += 1;
      if (entry.status !== 'PRESENT') missed[weekday] += 1;
    }
  }

  const all = total.reduce((a, b) => a + b, 0);
  if (all < MIN_CLASSES_FOR_INSIGHT) return null;
  const overallRate = missed.reduce((a, b) => a + b, 0) / all;

  let worst = -1;
  for (let i = 0; i < 7; i++) {
    if (missed[i] < MIN_MISSED_FOR_INSIGHT) continue;
    if (missed[i] / total[i] - overallRate < MIN_GAP_OVER_AVERAGE) continue;
    if (worst === -1 || missed[i] / total[i] > missed[worst] / total[worst]) worst = i;
  }
  if (worst === -1) return null;

  const names = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
  return { weekday: names[worst], missed: missed[worst], total: total[worst] };
}


/** "Jun – Dec 2026" for the Odd semester, "Jan – May 2027" for the Even one, or null with no single range. */
export function semesterSpanLabel(scopeKey: string): string | null {
  const range = semesterRange(scopeKey);
  if (!range) return null;
  const month = (d: Date) => d.toLocaleString('en-US', { month: 'short' });
  const sameYear = range.start.getFullYear() === range.end.getFullYear();
  return sameYear
    ? `${month(range.start)} – ${month(range.end)} ${range.end.getFullYear()}`
    : `${month(range.start)} ${range.start.getFullYear()} – ${month(range.end)} ${range.end.getFullYear()}`;
}
