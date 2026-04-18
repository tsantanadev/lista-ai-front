import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ItemRow } from '../ItemRow';
import type { Item } from '../../types/item';

const baseItem: Item = {
  id: 1,
  remoteId: null,
  listId: 10,
  description: 'Milk',
  checked: false,
  quantity: 2,
  price: null,
  uom: 'L',
  updatedAt: Date.now(),
  deletedAt: null,
};

describe('ItemRow', () => {
  it('renders item description', () => {
    const { getByText } = render(
      <ItemRow item={baseItem} onToggle={jest.fn()} onEdit={jest.fn()} onDelete={jest.fn()} />,
    );
    expect(getByText('Milk')).toBeTruthy();
  });

  it('renders quantity and unit label', () => {
    const { getByText } = render(
      <ItemRow item={baseItem} onToggle={jest.fn()} onEdit={jest.fn()} onDelete={jest.fn()} />,
    );
    expect(getByText('2 L')).toBeTruthy();
  });

  it('does not render qty label when quantity and uom are null', () => {
    const item: Item = { ...baseItem, quantity: null, uom: null };
    const { queryByText } = render(
      <ItemRow item={item} onToggle={jest.fn()} onEdit={jest.fn()} onDelete={jest.fn()} />,
    );
    expect(queryByText('null')).toBeNull();
  });

  it('calls onToggle when checkbox area is pressed', () => {
    const onToggle = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <ItemRow item={baseItem} onToggle={onToggle} onEdit={jest.fn()} onDelete={jest.fn()} />,
    );
    // TouchableOpacity renders as View in tests; get all touchable instances
    const { TouchableOpacity } = require('react-native');
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    fireEvent.press(touchables[0]);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onEdit when description area is pressed', () => {
    const onEdit = jest.fn();
    const { getByText } = render(
      <ItemRow item={baseItem} onToggle={jest.fn()} onEdit={onEdit} onDelete={jest.fn()} />,
    );
    fireEvent.press(getByText('Milk'));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when delete button is pressed', () => {
    const onDelete = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <ItemRow item={baseItem} onToggle={jest.fn()} onEdit={jest.fn()} onDelete={onDelete} />,
    );
    const { TouchableOpacity } = require('react-native');
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    fireEvent.press(touchables[touchables.length - 1]);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
