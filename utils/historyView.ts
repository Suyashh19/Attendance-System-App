import { currentAcademicYear, currentTerm, parseSpan } from './academicYear';
import { MIN_ATTENDANCE_PERCENT } from '../constants/theme';
import type { ClassEntry } from './classesView';

interface HistoryLike {
  id: number;
  name: string;
  type: string;
  stats: { PRESENT: number; total: number; EXCUSED?: number };
}

const MIN = MIN_ATTENDANCE_PERCENT / 100;

/** True when the student is under the minimum (and at least one class has been held). */
export function isBelowMinimum(present: number, total: number): boolean {
  return total > 0 && present / total < MIN;
}

/** Classes the student can still miss and stay at or above the minimum. */
export function classesCanMiss(present: number, total: number): number {
  if (total === 0 || isBelowMinimum(present, total)) return 0;
  // The small epsilon keeps exact fractions (e.g. 15 of 20 -> 0) from slipping below a whole number
  return Math.max(0, Math.floor(present / MIN - total + 1e-9));
}

export function percentOf(present: number, total: number): number | null {
  return total > 0 ? Math.round((present / total) * 100) : null;
}

// ─── Scope: which academic year and semester the page is about ─────────────

export const ALL_TIME = 'all';
const OTHER = 'other';

export interface ScopeOption {
  key: string;
  label: string;
  year: string;
  term: string;
}

function scopeOf(span?: string | null): ScopeOption {
  const parsed = parseSpan(span);
  if (!parsed) return { key: OTHER, label: 'Other', year: '', term: '' };
  if (!parsed.term) return { key: parsed.year, label: parsed.year, year: parsed.year, term: '' };
  return {
    key: `${parsed.year} ${parsed.term}`,
    label: `${parsed.year} · ${parsed.term}`,
    year: parsed.year,
    term: parsed.term,
  };
}

// Newest first: within a year the Even semester (January to May) comes after the Odd one
const TERM_RANK: Record<string, number> = { Even: 0, Odd: 1, '': 2 };

/** The semesters the student has classes in, newest first, with "Other" last. */
export function scopeOptions<T extends { id: number }>(
  history: T[],
  spanById: Map<number, string | null | undefined>
): ScopeOption[] {
  const found = new Map<string, ScopeOption>();
  for (const subject of history) {
    const option = scopeOf(spanById.get(subject.id));
    found.set(option.key, option);
  }

  return [...found.values()].sort((a, b) => {
    if (!a.year && b.year) return 1;
    if (a.year && !b.year) return -1;
    if (a.year !== b.year) return b.year.localeCompare(a.year);
    return (TERM_RANK[a.term] ?? 2) - (TERM_RANK[b.term] ?? 2);
  });
}

/** The running semester when the student has classes in it, else their newest one, else all time. */
export function defaultScope(options: ScopeOption[], now: Date = new Date()): string {
  const running = `${currentAcademicYear(now)} ${currentTerm(now)}`;
  if (options.some((o) => o.key === running)) return running;
  return options[0]?.key ?? ALL_TIME;
}

export function inScope<T extends { id: number }>(
  history: T[],
  scope: string,
  spanById: Map<number, string | null | undefined>
): T[] {
  if (scope === ALL_TIME) return history;
  return history.filter((s) => scopeOf(spanById.get(s.id)).key === scope);
}

// ─── Summary of what is in scope ───────────────────────────────────────────

interface Bucket {
  present: number;
  total: number;
  percent: number | null;
}

export interface HistorySummary {
  present: number;
  total: number;
  missed: number;
  /** Classes excused by approved leave; they are not part of `total` */
  excused: number;
  percent: number | null;
  /** Subjects under the minimum */
  belowCount: number;
  /** Subjects with at least one class held */
  heldCount: number;
  byType: { theory: Bucket | null; practical: Bucket | null };
  /** The subject furthest below the minimum, if any is below */
  weakest: { name: string; percent: number } | null;
  /** When nothing is below: the subject with the least room to miss a class */
  tightest: { name: string; canMiss: number } | null;
}

function bucket(list: HistoryLike[]): Bucket | null {
  const present = list.reduce((sum, s) => sum + s.stats.PRESENT, 0);
  const total = list.reduce((sum, s) => sum + s.stats.total, 0);
  return total > 0 ? { present, total, percent: percentOf(present, total) } : null;
}

export function summarizeHistory(list: HistoryLike[]): HistorySummary {
  const present = list.reduce((sum, s) => sum + s.stats.PRESENT, 0);
  const total = list.reduce((sum, s) => sum + s.stats.total, 0);
  const held = list.filter((s) => s.stats.total > 0);
  const below = held.filter((s) => isBelowMinimum(s.stats.PRESENT, s.stats.total));

  const ratio = (s: HistoryLike) => s.stats.PRESENT / s.stats.total;
  const lowest = [...below].sort((a, b) => ratio(a) - ratio(b))[0];
  const tight = [...held]
    .filter((s) => !isBelowMinimum(s.stats.PRESENT, s.stats.total))
    .sort((a, b) => classesCanMiss(a.stats.PRESENT, a.stats.total) - classesCanMiss(b.stats.PRESENT, b.stats.total))[0];

  return {
    present,
    total,
    missed: total - present,
    excused: list.reduce((sum, s) => sum + (s.stats.EXCUSED ?? 0), 0),
    percent: percentOf(present, total),
    belowCount: below.length,
    heldCount: held.length,
    byType: {
      theory: bucket(list.filter((s) => s.type === 'theory')),
      practical: bucket(list.filter((s) => s.type === 'practical')),
    },
    weakest: lowest ? { name: lowest.name, percent: percentOf(lowest.stats.PRESENT, lowest.stats.total) ?? 0 } : null,
    tightest:
      below.length === 0 && tight
        ? { name: tight.name, canMiss: classesCanMiss(tight.stats.PRESENT, tight.stats.total) }
        : null,
  };
}

// ─── The subject list: trouble first ───────────────────────────────────────

/** Subjects under the minimum first (lowest first), then those on track (tightest first), then ones with no classes yet. */
export function buildStudentList<T extends HistoryLike>(list: T[]): ClassEntry<T>[] {
  const ratio = (s: T) => s.stats.PRESENT / s.stats.total;
  const byRatio = (a: T, b: T) => ratio(a) - ratio(b) || a.name.localeCompare(b.name);

  const needs = list.filter((s) => isBelowMinimum(s.stats.PRESENT, s.stats.total)).sort(byRatio);
  const ok = list.filter((s) => s.stats.total > 0 && !isBelowMinimum(s.stats.PRESENT, s.stats.total)).sort(byRatio);
  const none = list.filter((s) => s.stats.total === 0).sort((a, b) => a.name.localeCompare(b.name));

  const entries: ClassEntry<T>[] = [];
  const add = (key: string, label: string, group: T[]) => {
    if (group.length === 0) return;
    entries.push({ kind: 'header', key, label, count: group.length });
    group.forEach((subject) => entries.push({ kind: 'subject', subject }));
  };

  add('needs', 'Needs attention', needs);
  add('ok', 'On track', ok);
  add('none', 'No classes yet', none);
  return entries;
}

// ─── Narrowing the subject list ────────────────────────────────────────────

export type StatusFilter = 'all' | 'below' | 'ok';

export interface StudentListFilters {
  category: 'theory' | 'practical' | null;
  status: StatusFilter;
}

export const NO_LIST_FILTERS: StudentListFilters = { category: null, status: 'all' };

export function listFilterCount(filters: StudentListFilters): number {
  return (filters.category ? 1 : 0) + (filters.status !== 'all' ? 1 : 0);
}

/** Subjects of the chosen type and standing whose name or code contains the search text. */
export function applyStudentFilters<T extends HistoryLike & { code: string }>(
  list: T[],
  filters: StudentListFilters,
  query: string
): T[] {
  const needle = query.trim().toLowerCase();
  return list.filter((s) => {
    if (filters.category && s.type !== filters.category) return false;

    const below = isBelowMinimum(s.stats.PRESENT, s.stats.total);
    if (filters.status === 'below' && !below) return false;
    if (filters.status === 'ok' && (s.stats.total === 0 || below)) return false;

    if (!needle) return true;
    return s.name.toLowerCase().includes(needle) || s.code.toLowerCase().includes(needle);
  });
}

/** "3 subjects · Theory · Needs attention" */
export function studentListSummary(count: number, filters: StudentListFilters): string {
  const parts = [`${count} ${count === 1 ? 'subject' : 'subjects'}`];
  if (filters.category) parts.push(filters.category === 'theory' ? 'Theory' : 'Practical');
  if (filters.status === 'below') parts.push('Needs attention');
  if (filters.status === 'ok') parts.push('On track');
  return parts.join(' · ');
}
