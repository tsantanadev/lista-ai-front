import { apiClient } from './client';

export type TokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type RegisterResult =
  | { status: 'authenticated'; tokens: TokenResponse }
  | { status: 'pending_verification'; message: string };

export async function apiRegister(
  email: string,
  password: string,
  name: string,
): Promise<RegisterResult> {
  const response = await apiClient.post('/v1/auth/register', { email, password, name });
  if (response.status === 202) {
    return { status: 'pending_verification', message: (response.data as { message: string }).message };
  }
  return { status: 'authenticated', tokens: response.data as TokenResponse };
}

export async function apiLogin(
  email: string,
  password: string,
): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/v1/auth/login', {
    email,
    password,
  });
  return data;
}

export async function apiGoogleAuth(idToken: string): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/v1/auth/google', {
    idToken,
  });
  return data;
}

export async function apiRefresh(refreshToken: string): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/v1/auth/refresh', {
    refreshToken,
  });
  return data;
}

export async function apiLogout(refreshToken: string): Promise<void> {
  await apiClient.post('/v1/auth/logout', { refreshToken });
}

export async function apiVerifyEmail(token: string): Promise<void> {
  await apiClient.post('/v1/auth/verify-email', { token });
}

export async function apiResendVerification(email: string): Promise<void> {
  await apiClient.post('/v1/auth/resend-verification', { email });
}
