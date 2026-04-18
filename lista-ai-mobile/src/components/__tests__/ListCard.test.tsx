import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ListCard } from '../ListCard';
import type { List } from '../../types/list';

// ListCard calls useItemsQuery internally — mock it
jest.mock('../../hooks/useItems', () => ({
  useItemsQuery: jest.fn(),
}));

import { useItemsQuery } from '../../hooks/useItems';

const baseList: List = {
  id: 1,
  remoteId: 10,
  name: 'Groceries',
  updatedAt: Date.now(),
  deletedAt: null,
};

beforeEach(() => {
  (useItemsQuery as jest.Mock).mockReturnValue({ data: [] });
});

describe('ListCard', () => {
  it('renders the list name', () => {
    const { getByText } = render(
      <ListCard list={baseList} onPress={jest.fn()} onDelete={jest.fn()} />,
    );
    expect(getByText('Groceries')).toBeTruthy();
  });

  it('shows 0 / 0 when no items', () => {
    (useItemsQuery as jest.Mock).mockReturnValue({ data: [] });
    const { getByText } = render(
      <ListCard list={baseList} onPress={jest.fn()} onDelete={jest.fn()} />,
    );
    expect(getByText('0 / 0')).toBeTruthy();
  });

  it('shows correct checked / total count', () => {
    (useItemsQuery as jest.Mock).mockReturnValue({
      data: [
        { id: 1, checked: true },
        { id: 2, checked: false },
        { id: 3, checked: true },
      ],
    });
    const { getByText } = render(
      <ListCard list={baseList} onPress={jest.fn()} onDelete={jest.fn()} />,
    );
    expect(getByText('2 / 3')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <ListCard list={baseList} onPress={onPress} onDelete={jest.fn()} />,
    );
    fireEvent.press(getByText('Groceries'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when long pressed', () => {
    const onDelete = jest.fn();
    const { getByText } = render(
      <ListCard list={baseList} onPress={jest.fn()} onDelete={onDelete} />,
    );
    fireEvent(getByText('Groceries'), 'longPress');
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
