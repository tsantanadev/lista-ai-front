import { executeSync } from '../executor';

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

jest.mock('../queue', () => ({
  getPending: jest.fn(),
  remove: jest.fn().mockResolvedValue(undefined),
  incrementRetry: jest.fn().mockResolvedValue(undefined),
  markFailed: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../api/lists', () => ({
  fetchLists: jest.fn().mockResolvedValue([]),
  createList: jest.fn(),
  deleteList: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../api/items', () => ({
  createItem: jest.fn(),
  updateItem: jest.fn(),
  deleteItem: jest.fn().mockResolvedValue(undefined),
}));

import { db } from '../../db';
import { getPending, remove, incrementRetry, markFailed } from '../queue';
import { createList, fetchLists } from '../../api/lists';
import { createItem, updateItem } from '../../api/items';

const makePending = (overrides = {}): any => ({
  id: 1,
  entity: 'list',
  operation: 'create',
  payload: JSON.stringify({ localId: -1, name: 'Groceries' }),
  retryCount: 0,
  lastError: null,
  ...overrides,
});

beforeEach(() => {
  mockSelectWhere = jest.fn().mockResolvedValue([]);
  mockOrderBy = jest.fn().mockResolvedValue([]);
  mockUpdateWhere = jest.fn().mockResolvedValue(undefined);
  mockDeleteWhere = jest.fn().mockResolvedValue(undefined);
  mockSet = jest.fn().mockReturnValue({ where: mockUpdateWhere });
  mockFrom = jest.fn().mockReturnValue({ where: mockSelectWhere, orderBy: mockOrderBy });
  mockValues = jest.fn().mockResolvedValue(undefined);
  jest.clearAllMocks();
  mockSet.mockReturnValue({ where: mockUpdateWhere });
  mockFrom.mockReturnValue({ where: mockSelectWhere, orderBy: mockOrderBy });
  (fetchLists as jest.Mock).mockResolvedValue([]);
});

describe('executeSync()', () => {
  it('skips entries with retryCount === -1', async () => {
    (getPending as jest.Mock).mockResolvedValue([makePending({ retryCount: -1 })]);

    await executeSync();

    expect(createList).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('calls createList and updates remoteId for list/create', async () => {
    (getPending as jest.Mock).mockResolvedValue([
      makePending({ entity: 'list', operation: 'create', payload: JSON.stringify({ localId: -1, name: 'Groceries' }) }),
    ]);
    (createList as jest.Mock).mockResolvedValue({ id: 99, name: 'Groceries' });

    await executeSync();

    expect(createList).toHaveBeenCalledWith('Groceries');
    expect(db.update).toHaveBeenCalled();
    expect(remove).toHaveBeenCalledWith(1);
  });

  it('calls incrementRetry on API failure', async () => {
    (getPending as jest.Mock).mockResolvedValue([makePending()]);
    (createList as jest.Mock).mockRejectedValue(new Error('network error'));

    await executeSync();

    expect(incrementRetry).toHaveBeenCalledWith(1, 'network error');
    expect(remove).not.toHaveBeenCalled();
  });

  it('calls markFailed after 4 retries (retryCount >= 4)', async () => {
    (getPending as jest.Mock).mockResolvedValue([makePending({ retryCount: 4 })]);
    (createList as jest.Mock).mockRejectedValue(new Error('persistent error'));

    await executeSync();

    expect(markFailed).toHaveBeenCalledWith(1, 'persistent error');
    expect(incrementRetry).not.toHaveBeenCalled();
  });

  it('routes item/create to createItem', async () => {
    const payload = {
      localId: -2,
      localListId: -1,
      remoteListId: 10,
      description: 'Milk',
    };
    (getPending as jest.Mock).mockResolvedValue([
      makePending({ entity: 'item', operation: 'create', payload: JSON.stringify(payload) }),
    ]);
    mockSelectWhere.mockResolvedValue([{ id: -1, remoteId: 10 }]);
    (createItem as jest.Mock).mockResolvedValue({ id: 55, description: 'Milk' });

    await executeSync();

    expect(createItem).toHaveBeenCalledWith(10, { description: 'Milk' });
    expect(remove).toHaveBeenCalledWith(1);
  });
});

describe('executeSync() with progress callback', () => {
  it('calls onProgress for each active entry processed', async () => {
    (getPending as jest.Mock).mockResolvedValue([
      makePending({ id: 1, retryCount: 0 }),
      makePending({ id: 2, retryCount: 0 }),
      makePending({ id: 3, retryCount: -1 }), // permanently failed — skipped
    ]);
    (createList as jest.Mock).mockResolvedValue({ id: 99, name: 'Groceries' });

    const onProgress = jest.fn();
    await executeSync(onProgress);

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2);
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2);
  });

  it('returns succeeded and failed counts', async () => {
    (getPending as jest.Mock).mockResolvedValue([
      makePending({ id: 1, retryCount: 0 }),
      makePending({ id: 2, retryCount: 0 }),
    ]);
    (createList as jest.Mock)
      .mockResolvedValueOnce({ id: 99, name: 'Groceries' }) // id:1 succeeds
      .mockRejectedValueOnce(new Error('network error'));    // id:2 fails

    const result = await executeSync();

    expect(result.total).toBe(2);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(1);
  });

  it('does not call onProgress when there are no active entries', async () => {
    (getPending as jest.Mock).mockResolvedValue([
      makePending({ id: 1, retryCount: -1 }),
    ]);

    const onProgress = jest.fn();
    const result = await executeSync(onProgress);

    expect(onProgress).not.toHaveBeenCalled();
    expect(result).toEqual({ total: 0, succeeded: 0, failed: 0 });
  });
});
