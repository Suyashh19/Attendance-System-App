import {
  NO_FILTERS,
  activeFilterCount,
  applyClassFilters,
  buildClassList,
  defaultFilters,
  filterSummary,
  filtersShowing,
  yearChoices,
} from '../utils/classesView';
import { OTHER_YEAR } from '../utils/academicYear';

const subjects = [
  { id: 1, name: 'Data Structures', code: 'CS201', type: 'theory', span: '2026-27 Odd' },
  { id: 2, name: 'Data Structures Lab', code: 'CS201', type: 'practical', span: '2026-27 Odd' },
  { id: 3, name: 'Compilers', code: 'CS402', type: 'theory', span: '2026-27 Even' },
  { id: 4, name: 'Networks', code: 'CN301', type: 'theory', span: '2025-26 Even' },
  { id: 5, name: 'Old Course', code: 'XX100', type: 'theory', span: 'Sem 5' },
  { id: 6, name: 'No Label', code: 'NL100', type: 'practical', span: null },
];

const OCT_2026 = new Date(2026, 9, 27);

describe('defaultFilters', () => {
  it('opens on the running year and term when a subject belongs to it', () => {
    expect(defaultFilters(subjects, OCT_2026)).toEqual({ category: null, year: '2026-27', term: 'Odd' });
  });

  it('shows everything when nothing belongs to the running term', () => {
    expect(defaultFilters([subjects[2], subjects[3]], OCT_2026)).toEqual(NO_FILTERS);
    expect(defaultFilters([], OCT_2026)).toEqual(NO_FILTERS);
  });
});

describe('filtersShowing', () => {
  it('targets the year and term of a saved subject', () => {
    expect(filtersShowing('2026-27 Even')).toEqual({ category: null, year: '2026-27', term: 'Even' });
    expect(filtersShowing('2026-27')).toEqual({ category: null, year: '2026-27', term: null });
  });

  it('clears the filters for a subject with no academic year', () => {
    expect(filtersShowing(null)).toEqual(NO_FILTERS);
    expect(filtersShowing('Sem 5')).toEqual(NO_FILTERS);
  });
});

describe('applyClassFilters', () => {
  it('returns everything with no filters or search', () => {
    expect(applyClassFilters(subjects, NO_FILTERS, '')).toHaveLength(6);
  });

  it('filters by type, year and term together', () => {
    const f = { category: 'theory' as const, year: '2026-27', term: 'Odd' as const };
    expect(applyClassFilters(subjects, f, '').map((s) => s.id)).toEqual([1]);
  });

  it('filters by year alone', () => {
    expect(applyClassFilters(subjects, { ...NO_FILTERS, year: '2026-27' }, '').map((s) => s.id)).toEqual([1, 2, 3]);
  });

  it('finds subjects without an academic year under Other', () => {
    expect(applyClassFilters(subjects, { ...NO_FILTERS, year: OTHER_YEAR }, '').map((s) => s.id)).toEqual([5, 6]);
  });

  it('searches name and code, ignoring case and spaces', () => {
    expect(applyClassFilters(subjects, NO_FILTERS, '  compil ').map((s) => s.id)).toEqual([3]);
    expect(applyClassFilters(subjects, NO_FILTERS, 'cs201').map((s) => s.id)).toEqual([1, 2]);
  });

  it('combines search with filters', () => {
    expect(applyClassFilters(subjects, { ...NO_FILTERS, category: 'practical' }, 'data').map((s) => s.id)).toEqual([2]);
  });
});

describe('activeFilterCount / yearChoices', () => {
  it('counts the filters that are on', () => {
    expect(activeFilterCount(NO_FILTERS)).toBe(0);
    expect(activeFilterCount({ category: 'theory', year: '2026-27', term: null })).toBe(2);
  });

  it('lists years newest first with Other last', () => {
    expect(yearChoices(subjects)).toEqual(['2026-27', '2025-26', OTHER_YEAR]);
    expect(yearChoices([subjects[0]])).toEqual(['2026-27']);
    expect(yearChoices([])).toEqual([]);
  });
});

describe('buildClassList', () => {
  const labels = (entries: ReturnType<typeof buildClassList>) =>
    entries.map((e) => (e.kind === 'header' ? `# ${e.label} (${e.count})` : e.subject.name));

  it('groups by year and term, newest first, sorted by name, Other last', () => {
    expect(labels(buildClassList(subjects, null))).toEqual([
      '# 2026-27 · Odd semester (2)',
      'Data Structures',
      'Data Structures Lab',
      '# 2026-27 · Even semester (1)',
      'Compilers',
      '# 2025-26 · Even semester (1)',
      'Networks',
      '# Other (2)',
      'No Label',
      'Old Course',
    ]);
  });

  it('puts the subject with a live session first, under its own header', () => {
    expect(labels(buildClassList(subjects, 3)).slice(0, 4)).toEqual([
      '# Live now (1)',
      'Compilers',
      '# 2026-27 · Odd semester (2)',
      'Data Structures',
    ]);
  });

  it('adds no headers when everything is in one group', () => {
    expect(labels(buildClassList([subjects[1], subjects[0]], null))).toEqual(['Data Structures', 'Data Structures Lab']);
  });

  it('returns an empty list for no subjects', () => {
    expect(buildClassList([], null)).toEqual([]);
  });
});

describe('filterSummary', () => {
  it('counts subjects and names the filters that are on', () => {
    expect(filterSummary(5, NO_FILTERS)).toBe('5 subjects');
    expect(filterSummary(1, { category: 'theory', year: '2026-27', term: 'Odd' })).toBe('1 subject · 2026-27 · Odd · Theory');
    expect(filterSummary(0, { category: null, year: OTHER_YEAR, term: null })).toBe('0 subjects · Other');
  });
});
