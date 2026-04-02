import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

export const lists = sqliteTable('lists', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  remoteId: integer('remote_id'),
  name: text('name').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
});

export const items = sqliteTable('items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  remoteId: integer('remote_id'),
  listId: integer('list_id').notNull().references(() => lists.id),
  description: text('description').notNull(),
  checked: integer('checked', { mode: 'boolean' }).notNull().default(false),
  quantity: text('quantity'),
  price: real('price'),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
});

export const syncQueue = sqliteTable('sync_queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entity: text('entity').notNull(),
  operation: text('operation').notNull(),
  payload: text('payload').notNull(),
  createdAt: integer('created_at').notNull(),
  retryCount: integer('retry_count').notNull().default(0),
  lastError: text('last_error'),
});
