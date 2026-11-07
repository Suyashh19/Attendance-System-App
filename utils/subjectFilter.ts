export type SubjectCategory = 'theory' | 'practical' | null;

interface Filterable {
  name: string;
  code: string;
  type: string;
  span?: string | null;
}

/** Subjects of the chosen category and semester whose name or code contains the search text. */
export function filterSubjects<T extends Filterable>(
  subjects: T[],
  category: SubjectCategory,
  query: string,
  span: string | null = null
): T[] {
  const needle = query.trim().toLowerCase();
  return subjects.filter((s) => {
    if (category && s.type !== category) return false;
    if (span && (s.span ?? '') !== span) return false;
    if (!needle) return true;
    return s.name.toLowerCase().includes(needle) || s.code.toLowerCase().includes(needle);
  });
}

/** The distinct semester labels in use, newest-looking first (so "2026-27" comes before "2025-26"). */
export function distinctSpans(subjects: { span?: string | null }[]): string[] {
  const spans = new Set<string>();
  for (const s of subjects) if (s.span) spans.add(s.span);
  return [...spans].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
}
