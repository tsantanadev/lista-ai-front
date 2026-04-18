import { generateLocalId } from '../id';

describe('generateLocalId()', () => {
  it('returns a negative integer', () => {
    const id = generateLocalId();
    expect(id).toBeLessThan(0);
    expect(Number.isInteger(id)).toBe(true);
  });

  it('successive calls return distinct values', async () => {
    const ids = new Set<number>();
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 2));
      ids.add(generateLocalId());
    }
    expect(ids.size).toBe(5);
  });
});
