import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { db } from './index';
import migrations from './migrations';

export async function runMigrations() {
  await migrate(db, migrations);
}
