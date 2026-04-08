import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../auth/store';

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach current access token ──────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token && !config.url?.startsWith('/v1/auth/')) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: silent token refresh on 401 ─────────────────────────
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function drainQueue(err: unknown, token?: string) {
  pendingQueue.forEach((p) => (err ? p.reject(err) : p.resolve(token!)));
  pendingQueue = [];
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Only retry once; skip auth endpoints to avoid infinite loops
    if (
      error.response?.status !== 401 ||
      original._retry ||
      original.url?.startsWith('/v1/auth/')
    ) {
      return Promise.reject(error);
    }

    original._retry = true;

    if (isRefreshing) {
      // Queue this request until the in-flight refresh completes
      return new Promise<string>((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers['Authorization'] = `Bearer ${token}`;
        return apiClient(original);
      });
    }

    isRefreshing = true;

    try {
      await useAuthStore.getState().refreshTokens();
      const newToken = useAuthStore.getState().accessToken!;
      drainQueue(null, newToken);
      original.headers['Authorization'] = `Bearer ${newToken}`;
      return apiClient(original);
    } catch (refreshErr) {
      drainQueue(refreshErr);
      await useAuthStore.getState().logout();
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  },
);
