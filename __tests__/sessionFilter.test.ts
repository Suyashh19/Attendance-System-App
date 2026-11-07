import { searchSessions, RECENT_DEFAULT_COUNT } from '../utils/sessionFilter';

// Local-time dates, so the tests do not depend on the machine's timezone
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 10, 30).toISOString();

const sessions = [
  { id: 1, subjectName: 'Data Structures', subjectCode: 'CS201', subjectType: 'theory', startTime: at(2026, 10, 20) },
  { id: 2, subjectName: 'Operating Systems', subjectCode: 'CS301', subjectType: 'theory', startTime: at(2026, 10, 12) },
  { id: 3, subjectName: 'Data Structures Lab', subjectCode: 'CS201', subjectType: 'practical', startTime: at(2026, 9, 5) },
];

const many = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  subjectName: 'Maths',
  subjectCode: 'MA101',
  subjectType: 'theory',
  startTime: at(2026, 8, (i % 28) + 1),
}));

const ids = (list: { id: number }[]) => list.map((s) => s.id);

describe('searchSessions', () => {
  it('shows only the newest classes while the search is empty', () => {
    expect(searchSessions(many, '')).toHaveLength(RECENT_DEFAULT_COUNT);
    expect(searchSessions(many, '   ')).toHaveLength(RECENT_DEFAULT_COUNT);
  });

  it('searches every class, not just the newest ones, once text is typed', () => {
    expect(searchSessions(many, 'maths')).toHaveLength(25);
  });

  it('matches subject name and code, ignoring case', () => {
    expect(ids(searchSessions(sessions, 'operating'))).toEqual([2]);
    expect(ids(searchSessions(sessions, 'cs201'))).toEqual([1, 3]);
  });

  it('matches the class type', () => {
    expect(ids(searchSessions(sessions, 'practical'))).toEqual([3]);
  });

  it('matches a date written as day and month name, either way round', () => {
    expect(ids(searchSessions(sessions, '12 oct'))).toEqual([2]);
    expect(ids(searchSessions(sessions, 'oct 12'))).toEqual([2]);
    expect(ids(searchSessions(sessions, '12 october 2026'))).toEqual([2]);
    expect(ids(searchSessions(sessions, 'Oct 12, 2026'))).toEqual([2]);
  });

  it('matches numeric dates', () => {
    expect(ids(searchSessions(sessions, '12/10/2026'))).toEqual([2]);
    expect(ids(searchSessions(sessions, '2026-10-12'))).toEqual([2]);
    expect(ids(searchSessions(sessions, '05-09-2026'))).toEqual([3]);
  });

  it('matches a whole month by name', () => {
    expect(ids(searchSessions(sessions, 'sep'))).toEqual([3]);
  });

  it('returns nothing when nothing matches', () => {
    expect(searchSessions(sessions, 'chemistry')).toEqual([]);
  });
});
