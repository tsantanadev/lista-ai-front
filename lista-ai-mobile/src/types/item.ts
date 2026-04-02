export interface Item {
  id: number;
  remoteId: number | null;
  listId: number;       // local list PK
  description: string;
  checked: boolean;
  quantity: string | null;
  price: number | null;
  updatedAt: number;
  deletedAt: number | null;
}

export interface ItemInput {
  description: string;
  checked?: boolean;
  quantity?: string;
  price?: number;
}
