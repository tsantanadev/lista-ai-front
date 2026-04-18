import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Register } from '../index';

jest.mock('../../../auth/store', () => ({
  useAuthStore: jest.fn(),
}));

import { useAuthStore } from '../../../auth/store';

const mockNavigation: any = { navigate: jest.fn() };

function makeStore(overrides = {}) {
  return {
    register: jest.fn().mockResolvedValue(undefined),
    loginGoogle: jest.fn().mockResolvedValue(undefined),
    error: null,
    clearError: jest.fn(),
    ...overrides,
  };
}

function getDisabled(node: any): boolean | undefined {
  let current: any = node;
  while (current) {
    if (current.props?.disabled !== undefined) return current.props.disabled;
    if (current.props?.accessibilityState?.disabled !== undefined)
      return current.props.accessibilityState.disabled;
    current = current.parent;
  }
  return undefined;
}

beforeEach(() => {
  jest.clearAllMocks();
  (useAuthStore as unknown as jest.Mock).mockReturnValue(makeStore());
});

describe('Register screen', () => {
  it('renders name, email and password fields', () => {
    const { getByPlaceholderText } = render(
      <Register navigation={mockNavigation} route={{} as any} />,
    );
    expect(getByPlaceholderText('auth.register.namePlaceholder')).toBeTruthy();
    expect(getByPlaceholderText('auth.emailPlaceholder')).toBeTruthy();
    expect(getByPlaceholderText('auth.passwordPlaceholder')).toBeTruthy();
  });

  it('submit button is disabled when fields are empty', () => {
    const { getByText } = render(<Register navigation={mockNavigation} route={{} as any} />);
    const btn = getByText('auth.register.createAccount');
    expect(getDisabled(btn)).toBeTruthy();
  });

  it('submit button is disabled when password is shorter than 6 characters', () => {
    const { getByPlaceholderText, getByText } = render(
      <Register navigation={mockNavigation} route={{} as any} />,
    );
    fireEvent.changeText(getByPlaceholderText('auth.register.namePlaceholder'), 'Alice');
    fireEvent.changeText(getByPlaceholderText('auth.emailPlaceholder'), 'a@b.com');
    fireEvent.changeText(getByPlaceholderText('auth.passwordPlaceholder'), '123');

    const btn = getByText('auth.register.createAccount');
    expect(getDisabled(btn)).toBeTruthy();
  });

  it('calls register with correct args when form is valid', async () => {
    const register = jest.fn().mockResolvedValue(undefined);
    (useAuthStore as unknown as jest.Mock).mockReturnValue(makeStore({ register }));

    const { getByPlaceholderText, getByText } = render(
      <Register navigation={mockNavigation} route={{} as any} />,
    );

    fireEvent.changeText(getByPlaceholderText('auth.register.namePlaceholder'), 'Alice');
    fireEvent.changeText(getByPlaceholderText('auth.emailPlaceholder'), 'alice@example.com');
    fireEvent.changeText(getByPlaceholderText('auth.passwordPlaceholder'), 'password123');
    fireEvent.press(getByText('auth.register.createAccount'));

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith('alice@example.com', 'password123', 'Alice');
    });
  });

  it('shows error banner when store has an error', () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue(
      makeStore({ error: 'Email already registered' }),
    );
    const { getByText } = render(<Register navigation={mockNavigation} route={{} as any} />);
    expect(getByText('Email already registered')).toBeTruthy();
  });
});
