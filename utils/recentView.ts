import { parseSpan } from './academicYear';
import { activeFilterCount, type ClassFilters } from './classesView';
import { RECENT_DEFAULT_COUNT, searchSessions } from './sessionFilter';

interface RecentLike {
  id: number;
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  subjectType: string;
  startTime: string;
}

/** True when the list is showing its plain default: no search and no filter, so only the newest few classes. */
export function isDefaultRecentView(filters: ClassFilters, query: string): boolean {
  return activeFilterCount(filters) === 0 && query.trim() === '';
}

/**
 * Recent classes narrowed by type, subject, academic year and semester (taken from the class's subject),
 * then by the search text. With nothing chosen it stays the newest few; any filter or search shows every match.
 */
export function applyRecentFilters<T extends RecentLike>(
  sessions: T[],
  filters: ClassFilters,
  query: string,
  spanBySubject: Map<number, string | null | undefined>
): T[] {
  const narrowed = sessions.filter((s) => {
    if (filters.category && s.subjectType !== filters.category) return false;
    if (filters.subjectId && s.subjectId !== filters.subjectId) return false;

    if (filters.year || filters.term) {
      const parsed = parseSpan(spanBySubject.get(s.subjectId));
      if (filters.year && (parsed?.year ?? 'other') !== filters.year) return false;
      if (filters.term && parsed?.term !== filters.term) return false;
    }
    return true;
  });

  if (query.trim()) return searchSessions(narrowed, query);
  return isDefaultRecentView(filters, query) ? narrowed.slice(0, RECENT_DEFAULT_COUNT) : narrowed;
}

export type RecentEntry<T> =
  | { kind: 'header'; key: string; label: string; count: number }
  | { kind: 'session'; session: T };

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function dateGroup(iso: string, now: Date): { key: string; label: string } {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return { key: 'unknown', label: 'Earlier' };

  const days = Math.round((startOfDay(now) - startOfDay(date)) / (24 * 60 * 60 * 1000));
  if (days <= 0) return { key: 'today', label: 'Today' };
  if (days === 1) return { key: 'yesterday', label: 'Yesterday' };
  if (days < 7) return { key: 'week', label: 'This week' };

  const label = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  return { key: `${date.getFullYear()}-${date.getMonth()}`, label };
}

/** Classes under Today, Yesterday, This week and then month headers. Keeps the order it is given (newest first). */
export function groupSessionsByDate<T extends { startTime: string }>(sessions: T[], now: Date = new Date()): RecentEntry<T>[] {
  const entries: RecentEntry<T>[] = [];
  let current: { key: string; header: Extract<RecentEntry<T>, { kind: 'header' }> } | null = null;

  for (const session of sessions) {
    const group = dateGroup(session.startTime, now);
    if (!current || current.key !== group.key) {
      const header = { kind: 'header' as const, key: group.key, label: group.label, count: 0 };
      entries.push(header);
      current = { key: group.key, header };
    }
    current.header.count += 1;
    entries.push({ kind: 'session', session });
  }

  return entries;
}

/** "Latest 10 classes" by default, otherwise "7 classes · Theory · CS201". */
export function recentSummary(count: number, filters: ClassFilters, query: string, subjectLabel?: string): string {
  if (isDefaultRecentView(filters, query)) return `Latest ${count} ${count === 1 ? 'class' : 'classes'}`;

  const parts = [`${count} ${count === 1 ? 'class' : 'classes'}`];
  if (subjectLabel) parts.push(subjectLabel);
  if (filters.year) parts.push(filters.year === 'other' ? 'Other' : filters.year);
  if (filters.term) parts.push(filters.term);
  if (filters.category) parts.push(filters.category === 'theory' ? 'Theory' : 'Practical');
  return parts.join(' · ');
}
