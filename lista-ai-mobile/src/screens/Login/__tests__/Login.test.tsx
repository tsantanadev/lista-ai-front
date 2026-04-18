import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Login } from '../index';

jest.mock('../../../auth/store', () => ({
  useAuthStore: jest.fn(),
}));

import { useAuthStore } from '../../../auth/store';

const mockNavigation: any = { navigate: jest.fn() };

function makeStore(overrides = {}) {
  return {
    loginLocal: jest.fn().mockResolvedValue(undefined),
    loginGoogle: jest.fn().mockResolvedValue(undefined),
    error: null,
    clearError: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (useAuthStore as unknown as jest.Mock).mockReturnValue(makeStore());
});

describe('Login screen', () => {
  it('renders email and password fields', () => {
    const { getByPlaceholderText } = render(<Login navigation={mockNavigation} route={{} as any} />);
    expect(getByPlaceholderText('auth.emailPlaceholder')).toBeTruthy();
    expect(getByPlaceholderText('auth.passwordPlaceholder')).toBeTruthy();
  });

  it('login button is disabled when fields are empty', () => {
    const { getByText } = render(<Login navigation={mockNavigation} route={{} as any} />);
    const btn = getByText('auth.login.signIn');
    // Walk up the tree to find the TouchableOpacity with disabled prop
    let node: any = btn;
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

  it('calls loginLocal with trimmed email and password', async () => {
    const loginLocal = jest.fn().mockResolvedValue(undefined);
    (useAuthStore as unknown as jest.Mock).mockReturnValue(makeStore({ loginLocal }));

    const { getByPlaceholderText, getByText } = render(
      <Login navigation={mockNavigation} route={{} as any} />,
    );

    fireEvent.changeText(getByPlaceholderText('auth.emailPlaceholder'), '  user@example.com  ');
    fireEvent.changeText(getByPlaceholderText('auth.passwordPlaceholder'), 'secret');
    fireEvent.press(getByText('auth.login.signIn'));

    await waitFor(() => {
      expect(loginLocal).toHaveBeenCalledWith('user@example.com', 'secret');
    });
  });

  it('shows error banner when store has an error', () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue(
      makeStore({ error: 'Invalid credentials' }),
    );
    const { getByText } = render(<Login navigation={mockNavigation} route={{} as any} />);
    expect(getByText('Invalid credentials')).toBeTruthy();
  });

  it('navigates to Register when sign-up link is pressed', () => {
    const navigate = jest.fn();
    const { getByText } = render(
      <Login navigation={{ ...mockNavigation, navigate }} route={{} as any} />,
    );
    fireEvent.press(getByText('auth.login.signUp'));
    expect(navigate).toHaveBeenCalledWith('Register');
  });
});
