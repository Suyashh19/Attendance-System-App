export type Term = 'Odd' | 'Even';

export const TERMS: Term[] = ['Odd', 'Even'];

/** Key and label of the group for subjects with no (or an old-style) academic year */
export const OTHER_YEAR = 'other';

// ─── The college calendar ────────────────────────────────────────────────────

/** The months each semester runs, 1 (January) to 12 (December). A semester may run past December. */
export interface SemesterCalendar {
  oddStart: number;
  oddEnd: number;
  evenStart: number;
  evenEnd: number;
}

/** Odd runs June to December and Even January to May; the academic year starts in June. */
export const DEFAULT_CALENDAR: SemesterCalendar = { oddStart: 6, oddEnd: 12, evenStart: 1, evenEnd: 5 };

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function monthShort(month: number): string {
  return MONTH_NAMES[month - 1]?.slice(0, 3) ?? '';
}

const isMonth = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 12;

/** How the twelve months line up when counted from the month the Odd semester starts. */
function layout(cal: SemesterCalendar) {
  const oddLen = ((cal.oddEnd - cal.oddStart + 12) % 12) + 1;
  const evenOffset = (cal.evenStart - cal.oddStart + 12) % 12;
  const evenLen = ((cal.evenEnd - cal.evenStart + 12) % 12) + 1;
  return { oddLen, evenOffset, evenLen };
}

/**
 * Why a calendar cannot be used, or null when it can. The Odd semester comes first, the Even one follows it,
 * and both fit inside one academic year without overlapping.
 */
export function validateCalendar(cal: SemesterCalendar): string | null {
  if (![cal.oddStart, cal.oddEnd, cal.evenStart, cal.evenEnd].every(isMonth)) return 'Choose a month for every field.';
  const { oddLen, evenOffset, evenLen } = layout(cal);
  if (evenOffset < oddLen) return 'The Even semester must start after the Odd semester ends.';
  if (evenOffset + evenLen > 12) return 'The Even semester must end before the next Odd semester starts.';
  return null;
}

let calendar: SemesterCalendar = DEFAULT_CALENDAR;

export function getSemesterCalendar(): SemesterCalendar {
  return calendar;
}

/** Use the college's months everywhere. An unusable calendar falls back to the standard one. */
export function setSemesterCalendar(next: SemesterCalendar): void {
  calendar = validateCalendar(next) ? DEFAULT_CALENDAR : { ...next };
}

/**
 * The academic year (by the year its Odd semester starts) and term a date falls in.
 * Months between the two semesters count as part of the next one, so a break never has "no semester".
 */
function locate(now: Date): { startYear: number; term: Term } {
  const month = now.getMonth() + 1;
  const cycleStart = month >= calendar.oddStart ? now.getFullYear() : now.getFullYear() - 1;
  const position = (month - calendar.oddStart + 12) % 12;
  const { oddLen, evenOffset, evenLen } = layout(calendar);

  if (position < oddLen) return { startYear: cycleStart, term: 'Odd' };
  if (position < evenOffset + evenLen) return { startYear: cycleStart, term: 'Even' };
  return { startYear: cycleStart + 1, term: 'Odd' };
}

/** First and last day of a semester (or of the whole academic year when `term` is null). */
export function semesterBounds(startYear: number, term: Term | null): { start: Date; end: Date } {
  // Months before the Odd start fall in the next calendar year
  const yearOf = (month: number) => startYear + (month < calendar.oddStart ? 1 : 0);
  const first = (month: number) => new Date(yearOf(month), month - 1, 1);
  const last = (month: number) => new Date(yearOf(month), month, 0);

  if (term === 'Odd') return { start: first(calendar.oddStart), end: last(calendar.oddEnd) };
  if (term === 'Even') return { start: first(calendar.evenStart), end: last(calendar.evenEnd) };
  return { start: first(calendar.oddStart), end: last(calendar.evenEnd) };
}

export function yearLabel(startYear: number): string {
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

export function currentAcademicYear(now: Date = new Date()): string {
  return yearLabel(locate(now).startYear);
}

export function currentTerm(now: Date = new Date()): Term {
  return locate(now).term;
}

/** The years offered when creating a subject: three back, the current one, and the next. Newest first. */
export function academicYearOptions(now: Date = new Date()): string[] {
  const start = locate(now).startYear;
  return [start + 1, start, start - 1, start - 2, start - 3].map(yearLabel);
}

/** "2026-27 Odd" -> { year: "2026-27", term: "Odd" }. Old free-text labels return null. */
export function parseSpan(span?: string | null): { year: string; term: Term | null } | null {
  const match = /^(\d{4}-\d{2})(?: (Odd|Even))?$/.exec((span ?? '').trim());
  if (!match) return null;
  return { year: match[1], term: (match[2] as Term | undefined) ?? null };
}

export function formatSpan(year: string, term: Term | null): string {
  return term ? `${year} ${term}` : year;
}

export interface YearGroup<T> {
  /** The academic year, or OTHER_YEAR */
  key: string;
  label: string;
  subjects: T[];
  /** Subjects per term; `none` counts the ones whose label has a year but no term */
  counts: { Odd: number; Even: number; none: number };
}

/** Subjects grouped by academic year, newest year first, with the "Other" group last. */
export function groupByAcademicYear<T extends { span?: string | null }>(subjects: T[]): YearGroup<T>[] {
  const groups = new Map<string, YearGroup<T>>();

  for (const subject of subjects) {
    const parsed = parseSpan(subject.span);
    const key = parsed?.year ?? OTHER_YEAR;
    let group = groups.get(key);
    if (!group) {
      group = { key, label: parsed ? key : 'Other', subjects: [], counts: { Odd: 0, Even: 0, none: 0 } };
      groups.set(key, group);
    }
    group.subjects.push(subject);
    group.counts[parsed?.term ?? 'none'] += 1;
  }

  return [...groups.values()].sort((a, b) => {
    if (a.key === OTHER_YEAR) return 1;
    if (b.key === OTHER_YEAR) return -1;
    return b.key.localeCompare(a.key);
  });
}

/** The subjects of one term inside a year group. `null` = those with no term (including the Other group). */
export function subjectsInTerm<T extends { span?: string | null }>(subjects: T[], term: Term | null): T[] {
  return subjects.filter((s) => (parseSpan(s.span)?.term ?? null) === term);
}

/** The terms that have subjects in a group, in Odd, Even, none order. */
export function termsPresent<T>(group: YearGroup<T>): (Term | null)[] {
  const present: (Term | null)[] = [];
  if (group.counts.Odd > 0) present.push('Odd');
  if (group.counts.Even > 0) present.push('Even');
  if (group.counts.none > 0) present.push(null);
  return present;
}
