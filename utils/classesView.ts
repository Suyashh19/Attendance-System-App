import {
  OTHER_YEAR,
  currentAcademicYear,
  currentTerm,
  parseSpan,
  type Term,
} from './academicYear';

export type ClassCategory = 'theory' | 'practical' | null;

export interface ClassFilters {
  category: ClassCategory;
  /** An academic year such as "2026-27", or OTHER_YEAR for subjects without one */
  year: string | null;
  term: Term | null;
  /** Recent classes only: show one subject's classes */
  subjectId?: number | null;
}

export const NO_FILTERS: ClassFilters = { category: null, year: null, term: null };

interface ClassLike {
  id: number;
  name: string;
  code: string;
  type: string;
  span?: string | null;
}

export function activeFilterCount(filters: ClassFilters): number {
  return (filters.category ? 1 : 0) + (filters.year ? 1 : 0) + (filters.term ? 1 : 0) + (filters.subjectId ? 1 : 0);
}

/**
 * What the faculty sees before touching any filter: the running academic year and term,
 * or everything when none of their subjects belong to it.
 */
export function defaultFilters(subjects: ClassLike[], now: Date = new Date()): ClassFilters {
  const year = currentAcademicYear(now);
  const term = currentTerm(now);
  const hasCurrent = subjects.some((s) => {
    const parsed = parseSpan(s.span);
    return parsed?.year === year && parsed.term === term;
  });
  return hasCurrent ? { category: null, year, term } : NO_FILTERS;
}

/** The filters that would show a just-saved subject, so it never lands out of sight. */
export function filtersShowing(span?: string | null): ClassFilters {
  const parsed = parseSpan(span);
  return parsed ? { category: null, year: parsed.year, term: parsed.term } : NO_FILTERS;
}

/** The years to offer in the filter sheet: those in use, newest first, then Other if some have none. */
export function yearChoices(subjects: { span?: string | null }[]): string[] {
  const years = new Set<string>();
  let hasOther = false;
  for (const s of subjects) {
    const parsed = parseSpan(s.span);
    if (parsed) years.add(parsed.year);
    else hasOther = true;
  }
  const sorted = [...years].sort((a, b) => b.localeCompare(a));
  return hasOther ? [...sorted, OTHER_YEAR] : sorted;
}

/** Subjects matching the type, year and term filters, and whose name or code contains the search text. */
export function applyClassFilters<T extends ClassLike>(subjects: T[], filters: ClassFilters, query: string): T[] {
  const needle = query.trim().toLowerCase();
  return subjects.filter((s) => {
    if (filters.category && s.type !== filters.category) return false;

    const parsed = parseSpan(s.span);
    if (filters.year && (parsed?.year ?? OTHER_YEAR) !== filters.year) return false;
    if (filters.term && parsed?.term !== filters.term) return false;

    if (!needle) return true;
    return s.name.toLowerCase().includes(needle) || s.code.toLowerCase().includes(needle);
  });
}

export type ClassEntry<T> =
  | { kind: 'header'; key: string; label: string; count: number }
  | { kind: 'subject'; subject: T };

const TERM_ORDER: Record<string, number> = { Odd: 0, Even: 1 };

function groupLabel(span?: string | null): { key: string; label: string; year: string; term: string } {
  const parsed = parseSpan(span);
  if (!parsed) return { key: OTHER_YEAR, label: 'Other', year: '', term: '' };
  if (!parsed.term) return { key: parsed.year, label: parsed.year, year: parsed.year, term: '' };
  return {
    key: `${parsed.year} ${parsed.term}`,
    label: `${parsed.year} · ${parsed.term} semester`,
    year: parsed.year,
    term: parsed.term,
  };
}

/**
 * The faculty's list: the subject with a running session first, then subjects grouped by academic year
 * and term (newest first, each group sorted by name). Headers appear only when there is more than one group.
 */
export function buildClassList<T extends ClassLike>(subjects: T[], liveSubjectId: number | null): ClassEntry<T>[] {
  const byName = (a: T, b: T) => a.name.localeCompare(b.name);

  const live = liveSubjectId === null ? [] : subjects.filter((s) => s.id === liveSubjectId);
  const rest = subjects.filter((s) => s.id !== liveSubjectId);

  const groups = new Map<string, { label: string; year: string; term: string; items: T[] }>();
  for (const s of rest) {
    const g = groupLabel(s.span);
    const group = groups.get(g.key) ?? { label: g.label, year: g.year, term: g.term, items: [] };
    group.items.push(s);
    groups.set(g.key, group);
  }

  const ordered = [...groups.entries()].sort(([, a], [, b]) => {
    if (!a.year && b.year) return 1;
    if (a.year && !b.year) return -1;
    if (a.year !== b.year) return b.year.localeCompare(a.year);
    return (TERM_ORDER[a.term] ?? 2) - (TERM_ORDER[b.term] ?? 2);
  });

  const showHeaders = ordered.length + (live.length ? 1 : 0) > 1;
  const entries: ClassEntry<T>[] = [];

  if (live.length) {
    if (showHeaders) entries.push({ kind: 'header', key: 'live', label: 'Live now', count: live.length });
    live.forEach((subject) => entries.push({ kind: 'subject', subject }));
  }

  for (const [key, group] of ordered) {
    if (showHeaders) entries.push({ kind: 'header', key, label: group.label, count: group.items.length });
    [...group.items].sort(byName).forEach((subject) => entries.push({ kind: 'subject', subject }));
  }

  return entries;
}

/** "5 subjects · 2026-27 · Odd · Theory": how many subjects are showing and which filters are on. */
export function filterSummary(count: number, filters: ClassFilters): string {
  const parts = [`${count} ${count === 1 ? 'subject' : 'subjects'}`];
  if (filters.year) parts.push(filters.year === OTHER_YEAR ? 'Other' : filters.year);
  if (filters.term) parts.push(filters.term);
  if (filters.category) parts.push(filters.category === 'theory' ? 'Theory' : 'Practical');
  return parts.join(' · ');
}
