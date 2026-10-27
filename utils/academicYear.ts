export type Term = 'Odd' | 'Even';

export const TERMS: Term[] = ['Odd', 'Even'];

/** Key and label of the group for subjects with no (or an old-style) academic year */
export const OTHER_YEAR = 'other';

/** The academic year starts in June: June to December is the Odd term, January to May the Even term. */
function startYearOf(now: Date): number {
  return now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
}

export function yearLabel(startYear: number): string {
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

export function currentAcademicYear(now: Date = new Date()): string {
  return yearLabel(startYearOf(now));
}

export function currentTerm(now: Date = new Date()): Term {
  return now.getMonth() >= 5 ? 'Odd' : 'Even';
}

/** The years offered when creating a subject: three back, the current one, and the next. Newest first. */
export function academicYearOptions(now: Date = new Date()): string[] {
  const start = startYearOf(now);
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
