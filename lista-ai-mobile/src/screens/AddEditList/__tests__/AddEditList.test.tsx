import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AddEditList } from '../index';

const mockMutateAsync = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../hooks/useLists', () => ({
  useCreateList: jest.fn(() => ({ mutateAsync: mockMutateAsync })),
  useUpdateList: jest.fn(() => ({ mutateAsync: mockMutateAsync })),
  useListsQuery: jest.fn(() => ({ data: [] })),
}));

const mockNavigation: any = { goBack: jest.fn(), navigate: jest.fn() };
const mockRoute: any = { params: undefined };

beforeEach(() => {
  jest.clearAllMocks();
  mockMutateAsync.mockResolvedValue(undefined);
});

describe('AddEditList screen', () => {
  it('renders the name input field', () => {
    const { getByPlaceholderText } = render(
      <AddEditList navigation={mockNavigation} route={mockRoute} />,
    );
    expect(getByPlaceholderText('lists.addEditList.namePlaceholder')).toBeTruthy();
  });

  it('save button is disabled when name is empty', () => {
    const { getByText } = render(
      <AddEditList navigation={mockNavigation} route={mockRoute} />,
    );
    // Walk up the tree to find the TouchableOpacity with disabled prop
    let node: any = getByText('common.save');
    let disabled: boolean | undefined;
    while (node) {
      if (node.props?.disabled !== undefined) {
        disabled = node.props.disabled;
        break;
      }
      if (node.props?.accessibilityState?.disabled !== undefined) {
        disabled = node.props.accessibilityState.disabled;
        break;
      }
      node = node.parent;
    }
    expect(disabled).toBeTruthy();
  });

  it('save button is enabled after entering a name', () => {
    const { getByPlaceholderText, getByText } = render(
      <AddEditList navigation={mockNavigation} route={mockRoute} />,
    );
    fireEvent.changeText(getByPlaceholderText('lists.addEditList.namePlaceholder'), 'Shopping');
    // Walk up the tree to find the TouchableOpacity with disabled prop
    let node: any = getByText('common.save');
    let disabled: boolean | undefined;
    while (node) {
      if (node.props?.disabled !== undefined) {
        disabled = node.props.disabled;
        break;
      }
      if (node.props?.accessibilityState?.disabled !== undefined) {
        disabled = node.props.accessibilityState.disabled;
        break;
      }
      node = node.parent;
    }
    expect(disabled).toBeFalsy();
  });

  it('calls useCreateList mutateAsync with trimmed name on save', async () => {
    const { getByPlaceholderText, getByText } = render(
      <AddEditList navigation={mockNavigation} route={mockRoute} />,
    );
    fireEvent.changeText(
      getByPlaceholderText('lists.addEditList.namePlaceholder'),
      '  My List  ',
    );
    fireEvent.press(getByText('common.save'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({ name: 'My List' });
    });
  });

  it('calls goBack after successful save', async () => {
    const { getByPlaceholderText, getByText } = render(
      <AddEditList navigation={mockNavigation} route={mockRoute} />,
    );
    fireEvent.changeText(getByPlaceholderText('lists.addEditList.namePlaceholder'), 'List');
    fireEvent.press(getByText('common.save'));

    await waitFor(() => {
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });
});
