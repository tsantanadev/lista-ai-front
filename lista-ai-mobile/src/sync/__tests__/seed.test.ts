import { seedFromRemote } from '../seed';

var mockSelectWhere: jest.Mock;
var mockUpdateWhere: jest.Mock;
var mockSet: jest.Mock;
var mockFrom: jest.Mock;
var mockValues: jest.Mock;

jest.mock('../../db', () => ({
  db: {
    select: jest.fn(() => ({ from: mockFrom })),
    insert: jest.fn(() => ({ values: mockValues })),
    update: jest.fn(() => ({ set: mockSet })),
  },
}));

jest.mock('../../api/lists', () => ({
  fetchLists: jest.fn(),
}));

jest.mock('../../api/items', () => ({
  fetchItems: jest.fn(),
}));

jest.mock('../../utils/date', () => ({
  now: jest.fn().mockReturnValue(1000),
}));

import { db } from '../../db';
import { fetchLists } from '../../api/lists';
import { fetchItems } from '../../api/items';

beforeEach(() => {
  mockSelectWhere = jest.fn().mockResolvedValue([]);
  mockUpdateWhere = jest.fn().mockResolvedValue(undefined);
  mockSet = jest.fn().mockReturnValue({ where: mockUpdateWhere });
  mockFrom = jest.fn().mockReturnValue({ where: mockSelectWhere });
  mockValues = jest.fn().mockResolvedValue(undefined);
  jest.clearAllMocks();
  mockSet.mockReturnValue({ where: mockUpdateWhere });
  mockFrom.mockReturnValue({ where: mockSelectWhere });
});

describe('seedFromRemote()', () => {
  it('does nothing when server returns no lists', async () => {
    (fetchLists as jest.Mock).mockResolvedValue([]);

    await seedFromRemote();

    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it('inserts a new list when not in local DB', async () => {
    (fetchLists as jest.Mock).mockResolvedValue([{ id: 10, name: 'Groceries' }]);
    (fetchItems as jest.Mock).mockResolvedValue([]);
    // 1st where: check if list exists → not found
    // 2nd where: post-insert select to get localListId → found
    mockSelectWhere
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 1, remoteId: 10 }]);

    await seedFromRemote();

    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ remoteId: 10, name: 'Groceries' }),
    );
  });

  it('updates an existing list without inserting', async () => {
    (fetchLists as jest.Mock).mockResolvedValue([{ id: 10, name: 'Groceries Updated' }]);
    (fetchItems as jest.Mock).mockResolvedValue([]);
    mockSelectWhere.mockResolvedValueOnce([{ id: 1, remoteId: 10 }]); // list exists

    await seedFromRemote();

    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith({ name: 'Groceries Updated' });
  });

  it('inserts items belonging to a new list', async () => {
    (fetchLists as jest.Mock).mockResolvedValue([{ id: 10, name: 'Groceries' }]);
    (fetchItems as jest.Mock).mockResolvedValue([
      { id: 20, description: 'Milk', checked: false },
    ]);
    mockSelectWhere
      .mockResolvedValueOnce([])                          // list not found
      .mockResolvedValueOnce([{ id: 1, remoteId: 10 }])  // get localListId
      .mockResolvedValueOnce([]);                         // item not found

    await seedFromRemote();

    expect(db.insert).toHaveBeenCalledTimes(2); // list insert + item insert
    expect(fetchItems).toHaveBeenCalledWith(10);
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ remoteId: 20, listId: 1, description: 'Milk', checked: false }),
    );
  });

  it('updates an existing item without inserting', async () => {
    (fetchLists as jest.Mock).mockResolvedValue([{ id: 10, name: 'Groceries' }]);
    (fetchItems as jest.Mock).mockResolvedValue([
      { id: 20, description: 'Milk', checked: true },
    ]);
    mockSelectWhere
      .mockResolvedValueOnce([{ id: 1, remoteId: 10 }]) // list exists
      .mockResolvedValueOnce([{ id: 2, remoteId: 20 }]); // item exists

    await seedFromRemote();

    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).toHaveBeenCalledTimes(2); // list update + item update
    expect(mockSet).toHaveBeenCalledWith({ description: 'Milk', checked: true });
  });

  it('reports progress once per list with correct (done, total)', async () => {
    (fetchLists as jest.Mock).mockResolvedValue([
      { id: 10, name: 'Groceries' },
      { id: 11, name: 'Hardware' },
    ]);
    (fetchItems as jest.Mock).mockResolvedValue([]);
    // each list: check existence (not found) + post-insert select (found)
    mockSelectWhere
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 1, remoteId: 10 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 2, remoteId: 11 }]);

    const onProgress = jest.fn();
    await seedFromRemote(onProgress);

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2);
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2);
  });

  it('propagates fetchLists errors to caller', async () => {
    (fetchLists as jest.Mock).mockRejectedValue(new Error('network error'));

    await expect(seedFromRemote()).rejects.toThrow('network error');
  });
});
