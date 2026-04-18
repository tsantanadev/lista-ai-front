import { shouldOverwrite } from '../conflict';

describe('shouldOverwrite()', () => {
  it('returns true when remote is newer than local', () => {
    expect(shouldOverwrite(1000, 2000)).toBe(true);
  });

  it('returns false when local is newer than remote', () => {
    expect(shouldOverwrite(2000, 1000)).toBe(false);
  });

  it('returns false when timestamps are equal', () => {
    expect(shouldOverwrite(1000, 1000)).toBe(false);
  });

  it('returns false when remoteUpdatedAt is undefined', () => {
    expect(shouldOverwrite(1000, undefined)).toBe(false);
  });
});
