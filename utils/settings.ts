import { DEFAULT_CALENDAR, validateCalendar, type SemesterCalendar } from './academicYear';

/** Which view the faculty's Subjects tab opens on. */
export type HomeStart = 'semester' | 'years';

export interface AppSettings {
  /** The months each semester runs (faculty) */
  calendar: SemesterCalendar;
  /** Ask "Start attendance?" before opening a session (faculty) */
  confirmStart: boolean;
  /** Open the Subjects tab inside the running semester, or on the list of academic years (faculty) */
  homeStart: HomeStart;
}

export const DEFAULT_SETTINGS: AppSettings = {
  calendar: DEFAULT_CALENDAR,
  confirmStart: true,
  homeStart: 'semester',
};

/** Saved settings read back from the phone. Anything missing or unusable falls back to its default. */
export function parseSettings(raw: string | null | undefined): AppSettings {
  if (!raw) return DEFAULT_SETTINGS;

  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    return DEFAULT_SETTINGS;
  }
  if (!data || typeof data !== 'object') return DEFAULT_SETTINGS;

  const calendar: SemesterCalendar = {
    oddStart: data.calendar?.oddStart,
    oddEnd: data.calendar?.oddEnd,
    evenStart: data.calendar?.evenStart,
    evenEnd: data.calendar?.evenEnd,
  };

  return {
    calendar: validateCalendar(calendar) ? DEFAULT_CALENDAR : calendar,
    confirmStart: typeof data.confirmStart === 'boolean' ? data.confirmStart : DEFAULT_SETTINGS.confirmStart,
    homeStart: data.homeStart === 'years' ? 'years' : 'semester',
  };
}

export function sameCalendar(a: SemesterCalendar, b: SemesterCalendar): boolean {
  return a.oddStart === b.oddStart && a.oddEnd === b.oddEnd && a.evenStart === b.evenStart && a.evenEnd === b.evenEnd;
}
