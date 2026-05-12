import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { VerifyEmailPending } from '../index';

jest.mock('../../../api/auth', () => ({
  apiResendVerification: jest.fn(),
}));

import { apiResendVerification } from '../../../api/auth';

const mockNavigation: any = { navigate: jest.fn() };

function makeRoute(email = 'user@example.com') {
  return { params: { email } } as any;
}

function makeAxiosError(status?: number) {
  const err: any = new Error('axios error');
  if (status !== undefined) {
    err.response = { status };
  }
  return err;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('VerifyEmailPending screen', () => {
  it('displays the email address from route params', () => {
    (apiResendVerification as jest.Mock).mockResolvedValue(undefined);
    const { getByText } = render(
      <VerifyEmailPending navigation={mockNavigation} route={makeRoute('hello@test.com')} />,
    );
    expect(getByText('hello@test.com')).toBeTruthy();
  });

  it('shows an email input field when email param is empty', () => {
    const { getByPlaceholderText } = render(
      <VerifyEmailPending navigation={mockNavigation} route={makeRoute('')} />,
    );
    expect(getByPlaceholderText('auth.emailPlaceholder')).toBeTruthy();
  });

  it('calls apiResendVerification with the route email on resend press', async () => {
    (apiResendVerification as jest.Mock).mockResolvedValue(undefined);
    const { getByText } = render(
      <VerifyEmailPending navigation={mockNavigation} route={makeRoute('a@b.com')} />,
    );
    fireEvent.press(getByText('auth.verification.pending.resendButton'));
    await waitFor(() => {
      expect(apiResendVerification).toHaveBeenCalledWith('a@b.com');
    });
  });

  it('calls apiResendVerification with the entered email when email param is empty', async () => {
    (apiResendVerification as jest.Mock).mockResolvedValue(undefined);
    const { getByPlaceholderText, getByText } = render(
      <VerifyEmailPending navigation={mockNavigation} route={makeRoute('')} />,
    );
    fireEvent.changeText(getByPlaceholderText('auth.emailPlaceholder'), 'typed@example.com');
    fireEvent.press(getByText('auth.verification.pending.resendButton'));
    await waitFor(() => {
      expect(apiResendVerification).toHaveBeenCalledWith('typed@example.com');
    });
  });

  it('shows success feedback after a successful resend', async () => {
    (apiResendVerification as jest.Mock).mockResolvedValue(undefined);
    const { getByText } = render(
      <VerifyEmailPending navigation={mockNavigation} route={makeRoute()} />,
    );
    fireEvent.press(getByText('auth.verification.pending.resendButton'));
    await waitFor(() => {
      expect(getByText('auth.verification.pending.resendSuccess')).toBeTruthy();
    });
  });

  it('shows cooldown feedback on 429 response', async () => {
    (apiResendVerification as jest.Mock).mockRejectedValue(makeAxiosError(429));
    const { getByText } = render(
      <VerifyEmailPending navigation={mockNavigation} route={makeRoute()} />,
    );
    fireEvent.press(getByText('auth.verification.pending.resendButton'));
    await waitFor(() => {
      expect(getByText('auth.verification.pending.resendCooldown')).toBeTruthy();
    });
  });

  it('shows generic error feedback on non-429 failure', async () => {
    (apiResendVerification as jest.Mock).mockRejectedValue(makeAxiosError(500));
    const { getByText } = render(
      <VerifyEmailPending navigation={mockNavigation} route={makeRoute()} />,
    );
    fireEvent.press(getByText('auth.verification.pending.resendButton'));
    await waitFor(() => {
      expect(getByText('auth.verification.pending.resendError')).toBeTruthy();
    });
  });

  it('shows generic error feedback on network failure (no response)', async () => {
    (apiResendVerification as jest.Mock).mockRejectedValue(makeAxiosError());
    const { getByText } = render(
      <VerifyEmailPending navigation={mockNavigation} route={makeRoute()} />,
    );
    fireEvent.press(getByText('auth.verification.pending.resendButton'));
    await waitFor(() => {
      expect(getByText('auth.verification.pending.resendError')).toBeTruthy();
    });
  });

  it('navigates to Login when back-to-login is pressed', () => {
    const navigate = jest.fn();
    const { getByText } = render(
      <VerifyEmailPending navigation={{ ...mockNavigation, navigate }} route={makeRoute()} />,
    );
    fireEvent.press(getByText('auth.verification.pending.backToLogin'));
    expect(navigate).toHaveBeenCalledWith('Login');
  });
});
