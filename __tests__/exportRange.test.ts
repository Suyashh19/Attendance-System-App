import { RANGE_PRESETS, presetRange, semesterStart } from '../utils/exportRange';

const OCT_27 = new Date(2026, 9, 27, 15, 30);

describe('semesterStart', () => {
  it('is 1 June from June to December', () => {
    expect(semesterStart(OCT_27)).toEqual(new Date(2026, 5, 1));
    expect(semesterStart(new Date(2026, 5, 1))).toEqual(new Date(2026, 5, 1));
  });

  it('is 1 January from January to May', () => {
    expect(semesterStart(new Date(2027, 2, 3))).toEqual(new Date(2027, 0, 1));
  });
});

describe('presetRange', () => {
  it('covers the last 7 days including today, from midnight', () => {
    const { from, to } = presetRange('7d', OCT_27);
    expect(from).toEqual(new Date(2026, 9, 21));
    expect(to).toEqual(OCT_27);
  });

  it('covers the last 30 days including today', () => {
    expect(presetRange('30d', OCT_27).from).toEqual(new Date(2026, 8, 28));
  });

  it('starts this semester on its first day', () => {
    expect(presetRange('term', OCT_27).from).toEqual(new Date(2026, 5, 1));
  });

  it('starts "all time" well before any records', () => {
    expect(presetRange('all', OCT_27).from.getFullYear()).toBeLessThanOrEqual(2020);
  });

  it('offers every preset with a label', () => {
    expect(RANGE_PRESETS.map((p) => p.key)).toEqual(['7d', '30d', 'term', 'all']);
    RANGE_PRESETS.forEach((p) => expect(presetRange(p.key, OCT_27).from.getTime()).toBeLessThanOrEqual(OCT_27.getTime()));
  });
});
