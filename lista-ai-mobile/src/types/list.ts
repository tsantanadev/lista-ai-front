export interface List {
  id: number;           // local PK (negative until synced)
  remoteId: number | null;
  name: string;
  updatedAt: number;    // unix ms
  deletedAt: number | null;
}

export interface ListInput {
  name: string;
}
