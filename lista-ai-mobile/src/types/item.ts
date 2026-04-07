export interface Item {
  id: number;
  remoteId: number | null;
  listId: number;
  description: string;
  checked: boolean;
  quantity: number | null;
  price: number | null;
  uom: string | null;
  updatedAt: number;
  deletedAt: number | null;
}

export interface ItemInput {
  description: string;
  checked?: boolean;
  quantity?: number;
  uom?: string;
}
