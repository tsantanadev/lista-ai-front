import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ListsHome } from '../index';

jest.mock('../../../hooks/useLists', () => ({
  useListsQuery: jest.fn(),
  useDeleteList: jest.fn(() => ({ mutate: jest.fn() })),
}));

// ListCard uses useItemsQuery internally
jest.mock('../../../hooks/useItems', () => ({
  useItemsQuery: jest.fn(() => ({ data: [] })),
}));

// SyncStatusBar depends on store and sync — mock it out
jest.mock('../../../components/SyncStatusBar', () => ({
  SyncStatusBar: () => null,
}));

import { useListsQuery } from '../../../hooks/useLists';

const mockNavigation: any = { navigate: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  mockNavigation.navigate.mockClear();
});

describe('ListsHome screen', () => {
  it('shows EmptyState when there are no lists', () => {
    (useListsQuery as jest.Mock).mockReturnValue({ data: [], isLoading: false });

    const { getByText } = render(
      <ListsHome navigation={mockNavigation} route={{} as any} />,
    );
    expect(getByText('lists.empty.title')).toBeTruthy();
  });

  it('renders a card for each list', () => {
    (useListsQuery as jest.Mock).mockReturnValue({
      data: [
        { id: 1, remoteId: null, name: 'Groceries', updatedAt: 1, deletedAt: null },
        { id: 2, remoteId: null, name: 'Hardware', updatedAt: 1, deletedAt: null },
      ],
      isLoading: false,
    });

    const { getByText } = render(
      <ListsHome navigation={mockNavigation} route={{} as any} />,
    );
    expect(getByText('Groceries')).toBeTruthy();
    expect(getByText('Hardware')).toBeTruthy();
  });

  it('navigates to ListDetail when a list card is pressed', () => {
    (useListsQuery as jest.Mock).mockReturnValue({
      data: [{ id: 1, remoteId: null, name: 'Groceries', updatedAt: 1, deletedAt: null }],
      isLoading: false,
    });

    const { getByText } = render(
      <ListsHome navigation={mockNavigation} route={{} as any} />,
    );
    fireEvent.press(getByText('Groceries'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('ListDetail', {
      listId: 1,
      listName: 'Groceries',
    });
  });

  it('navigates to AddEditList when FAB is pressed', () => {
    (useListsQuery as jest.Mock).mockReturnValue({ data: [], isLoading: false });

    const { getByText } = render(
      <ListsHome navigation={mockNavigation} route={{} as any} />,
    );
    fireEvent.press(getByText('lists.newList'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('AddEditList', undefined);
  });
});
