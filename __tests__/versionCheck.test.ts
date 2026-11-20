import { isVersionOlder } from '../services/versionCheck';

describe('Version Check Utilities', () => {
  describe('isVersionOlder', () => {
    it('returns true when current version has a lower patch number', () => {
      expect(isVersionOlder('1.2.4', '1.2.5')).toBe(true);
      expect(isVersionOlder('1.2.0', '1.2.1')).toBe(true);
    });

    it('returns true when current version has a lower minor number', () => {
      expect(isVersionOlder('1.1.9', '1.2.0')).toBe(true);
      expect(isVersionOlder('1.0.5', '1.2.5')).toBe(true);
    });

    it('returns true when current version has a lower major number', () => {
      expect(isVersionOlder('0.9.9', '1.0.0')).toBe(true);
      expect(isVersionOlder('1.2.5', '2.0.0')).toBe(true);
    });

    it('returns false when current version is equal to target version', () => {
      expect(isVersionOlder('1.2.5', '1.2.5')).toBe(false);
      expect(isVersionOlder('1.0.0', '1.0.0')).toBe(false);
    });

    it('returns false when current version is newer than target version', () => {
      expect(isVersionOlder('1.2.6', '1.2.5')).toBe(false);
      expect(isVersionOlder('1.3.0', '1.2.5')).toBe(false);
      expect(isVersionOlder('2.0.0', '1.2.5')).toBe(false);
    });

    it('handles versions with different segment counts safely', () => {
      expect(isVersionOlder('1.2', '1.2.1')).toBe(true);
      expect(isVersionOlder('1.2.1', '1.2')).toBe(false);
    });
  });
});
