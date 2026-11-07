interface SearchableSession {
  subjectName: string;
  subjectCode: string;
  subjectType: string;
  startTime: string;
}

/** How many classes the list shows while the search box is empty. */
export const RECENT_DEFAULT_COUNT = 10;

const pad = (n: number) => String(n).padStart(2, '0');

/** Every way a faculty member might type a class's date, joined into one lowercase string. */
function dateText(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  const shortMonth = d.toLocaleString('en-US', { month: 'short' });
  const longMonth = d.toLocaleString('en-US', { month: 'long' });
  const weekday = d.toLocaleString('en-US', { weekday: 'long' });

  return [
    `${day} ${shortMonth} ${year}`,
    `${day} ${longMonth} ${year}`,
    `${shortMonth} ${day} ${year}`,
    `${longMonth} ${day} ${year}`,
    `${pad(day)}/${pad(month)}/${year}`,
    `${day}/${month}/${year}`,
    `${pad(day)}-${pad(month)}-${year}`,
    `${year}-${pad(month)}-${pad(day)}`,
    weekday,
  ]
    .join(' | ')
    .toLowerCase();
}

/**
 * With no search text: the newest few classes.
 * With search text: every class whose subject, code, type or date matches it.
 * Dates match as typed in common forms: "12 oct", "oct 12", "12/10", "2026-10-12", "monday".
 */
export function searchSessions<T extends SearchableSession>(sessions: T[], query: string): T[] {
  const needle = query.trim().toLowerCase().replace(/,/g, '').replace(/\s+/g, ' ');
  if (!needle) return sessions.slice(0, RECENT_DEFAULT_COUNT);

  return sessions.filter((s) => {
    const haystack = `${s.subjectName} ${s.subjectCode} ${s.subjectType} | ${dateText(s.startTime)}`.toLowerCase();
    return haystack.includes(needle);
  });
}
