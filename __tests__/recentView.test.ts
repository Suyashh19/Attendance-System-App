import { NO_FILTERS } from '../utils/classesView';
import { RECENT_DEFAULT_COUNT } from '../utils/sessionFilter';
import { applyRecentFilters, groupSessionsByDate, isDefaultRecentView, recentSummary } from '../utils/recentView';

const NOW = new Date(2026, 9, 27, 14, 0);
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 10, 30).toISOString();

const sessions = [
  { id: 1, subjectId: 10, subjectName: 'Data Structures', subjectCode: 'CS201', subjectType: 'theory', startTime: at(2026, 10, 27) },
  { id: 2, subjectId: 11, subjectName: 'Data Structures Lab', subjectCode: 'CS201', subjectType: 'practical', startTime: at(2026, 10, 26) },
  { id: 3, subjectId: 12, subjectName: 'Compilers', subjectCode: 'CS402', subjectType: 'theory', startTime: at(2026, 10, 23) },
  { id: 4, subjectId: 10, subjectName: 'Data Structures', subjectCode: 'CS201', subjectType: 'theory', startTime: at(2026, 10, 12) },
  { id: 5, subjectId: 13, subjectName: 'Networks', subjectCode: 'CN301', subjectType: 'theory', startTime: at(2026, 9, 5) },
];

const spans = new Map<number, string | null>([
  [10, '2026-27 Odd'],
  [11, '2026-27 Odd'],
  [12, '2026-27 Even'],
  [13, '2025-26 Even'],
]);

const ids = (list: { id: number }[]) => list.map((s) => s.id);

describe('applyRecentFilters', () => {
  it('keeps only the newest few with no search or filter', () => {
    const many = Array.from({ length: 25 }, (_, i) => ({ ...sessions[0], id: i + 1 }));
    expect(applyRecentFilters(many, NO_FILTERS, '', spans)).toHaveLength(RECENT_DEFAULT_COUNT);
  });

  it('shows every match once a filter is on', () => {
    const many = Array.from({ length: 25 }, (_, i) => ({ ...sessions[0], id: i + 1 }));
    expect(applyRecentFilters(many, { ...NO_FILTERS, category: 'theory' }, '', spans)).toHaveLength(25);
  });

  it('filters by type', () => {
    expect(ids(applyRecentFilters(sessions, { ...NO_FILTERS, category: 'practical' }, '', spans))).toEqual([2]);
  });

  it('filters by subject', () => {
    expect(ids(applyRecentFilters(sessions, { ...NO_FILTERS, subjectId: 10 }, '', spans))).toEqual([1, 4]);
  });

  it('filters by the academic year and term of the classes subject', () => {
    expect(ids(applyRecentFilters(sessions, { ...NO_FILTERS, year: '2026-27' }, '', spans))).toEqual([1, 2, 3, 4]);
    expect(ids(applyRecentFilters(sessions, { ...NO_FILTERS, year: '2026-27', term: 'Even' }, '', spans))).toEqual([3]);
  });

  it('treats a subject with no span as Other', () => {
    const unknown = new Map<number, string | null>();
    expect(ids(applyRecentFilters(sessions, { ...NO_FILTERS, year: 'other' }, '', unknown))).toHaveLength(5);
  });

  it('combines filters with the search text', () => {
    expect(ids(applyRecentFilters(sessions, { ...NO_FILTERS, category: 'theory' }, 'data', spans))).toEqual([1, 4]);
  });
});

describe('groupSessionsByDate', () => {
  it('puts classes under Today, Yesterday, This week and month headers', () => {
    const entries = groupSessionsByDate(sessions, NOW);
    const text = entries.map((e) => (e.kind === 'header' ? `# ${e.label} (${e.count})` : e.session.id));
    expect(text).toEqual([
      '# Today (1)', 1,
      '# Yesterday (1)', 2,
      '# This week (1)', 3,
      '# October 2026 (1)', 4,
      '# September 2026 (1)', 5,
    ]);
  });

  it('groups several classes of one day together', () => {
    const entries = groupSessionsByDate([sessions[0], { ...sessions[0], id: 9 }], NOW);
    expect(entries[0]).toMatchObject({ kind: 'header', label: 'Today', count: 2 });
  });

  it('returns nothing for no classes', () => {
    expect(groupSessionsByDate([], NOW)).toEqual([]);
  });
});

describe('recentSummary / isDefaultRecentView', () => {
  it('describes the default view as the latest classes', () => {
    expect(isDefaultRecentView(NO_FILTERS, '')).toBe(true);
    expect(recentSummary(10, NO_FILTERS, '')).toBe('Latest 10 classes');
  });

  it('names the filters once something is chosen', () => {
    const f = { ...NO_FILTERS, category: 'theory' as const, year: '2026-27' };
    expect(isDefaultRecentView(f, '')).toBe(false);
    expect(recentSummary(7, f, '', 'CS201')).toBe('7 classes · CS201 · 2026-27 · Theory');
    expect(recentSummary(1, NO_FILTERS, 'data')).toBe('1 class');
  });
});
