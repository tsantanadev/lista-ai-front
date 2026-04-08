import * as SecureStore from 'expo-secure-store';

const KEYS = {
  accessToken:  'auth.accessToken',
  refreshToken: 'auth.refreshToken',
  userName:     'auth.userName',
  userEmail:    'auth.userEmail',
  userId:       'auth.userId',
} as const;

export type StoredUser = {
  id: string;
  name: string;
  email: string;
};

export type StoredTokens = {
  accessToken: string;
  refreshToken: string;
};

export async function saveAuth(tokens: StoredTokens, user: StoredUser): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(KEYS.accessToken,  tokens.accessToken),
    SecureStore.setItemAsync(KEYS.refreshToken, tokens.refreshToken),
    SecureStore.setItemAsync(KEYS.userName,     user.name),
    SecureStore.setItemAsync(KEYS.userEmail,    user.email),
    SecureStore.setItemAsync(KEYS.userId,       user.id),
  ]);
}

export async function loadAuth(): Promise<{ tokens: StoredTokens; user: StoredUser } | null> {
  const [accessToken, refreshToken, name, email, id] = await Promise.all([
    SecureStore.getItemAsync(KEYS.accessToken),
    SecureStore.getItemAsync(KEYS.refreshToken),
    SecureStore.getItemAsync(KEYS.userName),
    SecureStore.getItemAsync(KEYS.userEmail),
    SecureStore.getItemAsync(KEYS.userId),
  ]);
  if (!accessToken || !refreshToken || !email || !id) return null;
  return {
    tokens: { accessToken, refreshToken },
    user:   { id, name: name ?? email.split('@')[0], email },
  };
}

export async function clearAuth(): Promise<void> {
  await Promise.all(
    Object.values(KEYS).map((k) => SecureStore.deleteItemAsync(k)),
  );
}
