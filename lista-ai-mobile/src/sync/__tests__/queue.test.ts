import { enqueue, getPending, remove, incrementRetry, markFailed, getActivePendingCount } from '../queue';

// var declarations are hoisted — they exist as undefined when jest.mock factory runs,
// but the factory closures capture them by reference and see the assigned values at call time.
var mockOrderBy: jest.Mock;
var mockSelectWhere: jest.Mock;
var mockUpdateWhere: jest.Mock;
var mockDeleteWhere: jest.Mock;
var mockSet: jest.Mock;
var mockFrom: jest.Mock;
var mockValues: jest.Mock;

jest.mock('../../db', () => ({
  db: {
    select: jest.fn(() => ({ from: mockFrom })),
    insert: jest.fn(() => ({ values: mockValues })),
    update: jest.fn(() => ({ set: mockSet })),
    delete: jest.fn(() => ({ where: mockDeleteWhere })),
  },
}));

import { db } from '../../db';
import { now } from '../../utils/date';

jest.mock('../../utils/date', () => ({ now: jest.fn(() => 1000) }));

beforeEach(() => {
  mockSelectWhere = jest.fn().mockResolvedValue([]);
  mockOrderBy = jest.fn().mockResolvedValue([]);
  mockUpdateWhere = jest.fn().mockResolvedValue(undefined);
  mockDeleteWhere = jest.fn().mockResolvedValue(undefined);
  mockSet = jest.fn().mockReturnValue({ where: mockUpdateWhere });
  mockFrom = jest.fn().mockReturnValue({ where: mockSelectWhere, orderBy: mockOrderBy });
  mockValues = jest.fn().mockResolvedValue(undefined);
  jest.clearAllMocks();
  // Re-apply return values after clearAllMocks
  mockSet.mockReturnValue({ where: mockUpdateWhere });
  mockFrom.mockReturnValue({ where: mockSelectWhere, orderBy: mockOrderBy });
});

describe('enqueue()', () => {
  it('calls db.insert with the correct entity, operation and payload', async () => {
    await enqueue({ entity: 'list', operation: 'create', payload: '{}' });

    expect(db.insert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'list',
        operation: 'create',
        payload: '{}',
        retryCount: 0,
        lastError: null,
      }),
    );
  });
});

describe('getPending()', () => {
  it('returns rows ordered by createdAt', async () => {
    const rows = [
      { id: 1, entity: 'list', operation: 'create', payload: '{}', createdAt: 100, retryCount: 0, lastError: null },
    ];
    mockOrderBy.mockResolvedValue(rows);

    const result = await getPending();

    expect(result).toEqual(rows);
    expect(db.select).toHaveBeenCalled();
  });

  it('returns empty array when queue is empty', async () => {
    mockOrderBy.mockResolvedValue([]);
    const result = await getPending();
    expect(result).toEqual([]);
  });
});

describe('remove()', () => {
  it('calls db.delete with the given id', async () => {
    await remove(42);

    expect(db.delete).toHaveBeenCalled();
    expect(mockDeleteWhere).toHaveBeenCalled();
  });
});

describe('incrementRetry()', () => {
  it('increments retryCount and sets lastError', async () => {
    const entry = { id: 7, retryCount: 1, lastError: null };
    mockSelectWhere.mockResolvedValue([entry]);

    await incrementRetry(7, 'network error');

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ retryCount: 2, lastError: 'network error' }),
    );
  });

  it('does nothing when entry is not found', async () => {
    mockSelectWhere.mockResolvedValue([]);
    await incrementRetry(99, 'err');
    expect(mockSet).not.toHaveBeenCalled();
  });
});

describe('markFailed()', () => {
  it('sets retryCount to -1', async () => {
    await markFailed(3, 'fatal error');

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ retryCount: -1, lastError: 'fatal error' }),
    );
  });
});

describe('getActivePendingCount()', () => {
  it('returns the number of entries with retryCount >= 0', async () => {
    mockSelectWhere.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const result = await getActivePendingCount();

    expect(result).toBe(2);
    expect(db.select).toHaveBeenCalled();
  });

  it('returns 0 when no active entries exist', async () => {
    mockSelectWhere.mockResolvedValue([]);

    const result = await getActivePendingCount();

    expect(result).toBe(0);
  });
});
