import { apiClient } from './client';

export interface RemoteList {
  id: number;
  name: string;
}

export async function fetchLists(): Promise<RemoteList[]> {
  const response = await apiClient.get<RemoteList[]>('/v1/lists');
  return response.data;
}

export async function createList(name: string): Promise<RemoteList> {
  const response = await apiClient.post<RemoteList>('/v1/lists', { name });
  return response.data;
}

export async function deleteList(remoteId: number): Promise<void> {
  await apiClient.delete(`/v1/lists/${remoteId}`);
}
