import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { VerifyEmail } from '../index';

jest.mock('../../../api/auth', () => ({
  apiVerifyEmail: jest.fn(),
}));

import { apiVerifyEmail } from '../../../api/auth';

const mockNavigation: any = { navigate: jest.fn() };

function makeRoute(token = 'abc123') {
  return { params: { token } } as any;
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

describe('VerifyEmail screen', () => {
  it('shows loading state while API call is in flight', () => {
    (apiVerifyEmail as jest.Mock).mockReturnValue(new Promise(() => {}));
    const { getByText } = render(
      <VerifyEmail navigation={mockNavigation} route={makeRoute()} />,
    );
    expect(getByText('auth.verification.verify.loading')).toBeTruthy();
  });

  it('shows success state when token is valid', async () => {
    (apiVerifyEmail as jest.Mock).mockResolvedValue(undefined);
    const { getByText } = render(
      <VerifyEmail navigation={mockNavigation} route={makeRoute()} />,
    );
    await waitFor(() => {
      expect(getByText('auth.verification.verify.successTitle')).toBeTruthy();
    });
  });

  it('shows invalid state on 400 response', async () => {
    (apiVerifyEmail as jest.Mock).mockRejectedValue(makeAxiosError(400));
    const { getByText } = render(
      <VerifyEmail navigation={mockNavigation} route={makeRoute()} />,
    );
    await waitFor(() => {
      expect(getByText('auth.verification.verify.invalidTitle')).toBeTruthy();
    });
  });

  it('shows expired state on 410 response', async () => {
    (apiVerifyEmail as jest.Mock).mockRejectedValue(makeAxiosError(410));
    const { getByText } = render(
      <VerifyEmail navigation={mockNavigation} route={makeRoute()} />,
    );
    await waitFor(() => {
      expect(getByText('auth.verification.verify.expiredTitle')).toBeTruthy();
    });
  });

  it('shows network error state when API call fails without a response', async () => {
    (apiVerifyEmail as jest.Mock).mockRejectedValue(makeAxiosError());
    const { getByText } = render(
      <VerifyEmail navigation={mockNavigation} route={makeRoute()} />,
    );
    await waitFor(() => {
      expect(getByText('auth.verification.verify.networkErrorTitle')).toBeTruthy();
    });
  });

  it('retry button on network error re-calls the API', async () => {
    (apiVerifyEmail as jest.Mock)
      .mockRejectedValueOnce(makeAxiosError())
      .mockResolvedValueOnce(undefined);

    const { getByText } = render(
      <VerifyEmail navigation={mockNavigation} route={makeRoute()} />,
    );

    await waitFor(() => {
      expect(getByText('auth.verification.verify.retry')).toBeTruthy();
    });

    fireEvent.press(getByText('auth.verification.verify.retry'));

    await waitFor(() => {
      expect(getByText('auth.verification.verify.successTitle')).toBeTruthy();
    });
    expect(apiVerifyEmail).toHaveBeenCalledTimes(2);
  });

  it('navigates to Login when go-to-login is pressed on success', async () => {
    (apiVerifyEmail as jest.Mock).mockResolvedValue(undefined);
    const navigate = jest.fn();
    const { getByText } = render(
      <VerifyEmail navigation={{ ...mockNavigation, navigate }} route={makeRoute()} />,
    );
    await waitFor(() => getByText('auth.verification.verify.goToLogin'));
    fireEvent.press(getByText('auth.verification.verify.goToLogin'));
    expect(navigate).toHaveBeenCalledWith('Login');
  });

  it('navigates to Login when back-to-login is pressed on invalid state', async () => {
    (apiVerifyEmail as jest.Mock).mockRejectedValue(makeAxiosError(400));
    const navigate = jest.fn();
    const { getByText } = render(
      <VerifyEmail navigation={{ ...mockNavigation, navigate }} route={makeRoute()} />,
    );
    await waitFor(() => getByText('auth.verification.pending.backToLogin'));
    fireEvent.press(getByText('auth.verification.pending.backToLogin'));
    expect(navigate).toHaveBeenCalledWith('Login');
  });

  it('navigates to VerifyEmailPending when request-new-link is pressed on expired state', async () => {
    (apiVerifyEmail as jest.Mock).mockRejectedValue(makeAxiosError(410));
    const navigate = jest.fn();
    const { getByText } = render(
      <VerifyEmail navigation={{ ...mockNavigation, navigate }} route={makeRoute()} />,
    );
    await waitFor(() => getByText('auth.verification.verify.requestNewLink'));
    fireEvent.press(getByText('auth.verification.verify.requestNewLink'));
    expect(navigate).toHaveBeenCalledWith('VerifyEmailPending', { email: '' });
  });
});
