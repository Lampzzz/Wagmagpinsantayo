import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { MIGRATIONS } from './migrations';

const DATABASE_NAME = 'pinsan.db';

let opening: Promise<SQLiteDatabase> | null = null;

/** The app's database on the phone, opened once and migrated to the latest schema. */
export function getDatabase(): Promise<SQLiteDatabase> {
  opening ??= openDatabase().catch((error: unknown) => {
    // Let the next call try again instead of keeping the failure.
    opening = null;
    throw error;
  });
  return opening;
}

async function openDatabase() {
  const db = await openDatabaseAsync(DATABASE_NAME);
  try {
    // Can't be changed inside a transaction, so it runs before the migrations.
    await db.execAsync('PRAGMA journal_mode = WAL');
    await migrate(db);
    return db;
  } catch (error) {
    await db.closeAsync().catch(() => undefined);
    throw error;
  }
}

async function migrate(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current > MIGRATIONS.length) {
    throw new Error(
      `The database schema (${current}) is newer than this app supports (${MIGRATIONS.length}).`,
    );
  }
  for (let version = current + 1; version <= MIGRATIONS.length; version++) {
    const migration = MIGRATIONS[version - 1];
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration);
      // PRAGMA values can't be bound as parameters. `version` is our own integer.
      await db.execAsync(`PRAGMA user_version = ${version}`);
    });
  }
}
