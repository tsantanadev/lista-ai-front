import { apiClient } from './client';

export type TokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export async function apiRegister(
  email: string,
  password: string,
  name: string,
): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/v1/auth/register', {
    email,
    password,
    name,
  });
  return data;
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
