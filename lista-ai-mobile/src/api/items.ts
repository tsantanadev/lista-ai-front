import { apiClient } from './client';

export interface RemoteItem {
  id: number;
  description: string;
  checked: boolean;
}

export async function fetchItems(remoteListId: number): Promise<RemoteItem[]> {
  const response = await apiClient.get<RemoteItem[]>(`/v1/lists/${remoteListId}/items`);
  return response.data;
}

export async function createItem(
  remoteListId: number,
  data: { description: string }
): Promise<void> {
  await apiClient.post(`/v1/lists/${remoteListId}/items`, data);
}

export async function updateItem(
  remoteListId: number,
  remoteItemId: number,
  data: { description: string; checked: boolean }
): Promise<RemoteItem> {
  const response = await apiClient.put<RemoteItem>(
    `/v1/lists/${remoteListId}/items/${remoteItemId}`,
    data
  );
  return response.data;
}

export async function deleteItem(
  remoteListId: number,
  remoteItemId: number
): Promise<void> {
  await apiClient.delete(`/v1/lists/${remoteListId}/items/${remoteItemId}`);
}
