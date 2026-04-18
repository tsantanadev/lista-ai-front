import { now } from '../date';

describe('now()', () => {
  it('returns a number', () => {
    expect(typeof now()).toBe('number');
  });

  it('is close to Date.now()', () => {
    const before = Date.now();
    const result = now();
    const after = Date.now();
    expect(result).toBeGreaterThanOrEqual(before);
    expect(result).toBeLessThanOrEqual(after);
  });

  it('increases monotonically across successive calls', () => {
    const first = now();
    const second = now();
    expect(second).toBeGreaterThanOrEqual(first);
  });
});
