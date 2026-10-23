import { maskEmail } from '../utils/maskEmail';

describe('maskEmail', () => {
  it('keeps the first letter and the domain', () => {
    expect(maskEmail('suyash.patil@gmail.com')).toBe('s***@gmail.com');
    expect(maskEmail('a@b.in')).toBe('a***@b.in');
  });

  it('never shows the rest of the name', () => {
    expect(maskEmail('secretname@college.edu')).not.toContain('ecret');
  });

  it('falls back to wording when there is no usable address', () => {
    expect(maskEmail(undefined)).toBe('your registered email');
    expect(maskEmail(null)).toBe('your registered email');
    expect(maskEmail('')).toBe('your registered email');
    expect(maskEmail('not-an-email')).toBe('your registered email');
    expect(maskEmail('@gmail.com')).toBe('your registered email');
  });
});
