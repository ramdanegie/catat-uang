import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { drizzle, type BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import * as schema from './schema';

const DB_PATH = process.env.DB_PATH ?? './data/app.db';

mkdirSync(dirname(DB_PATH), { recursive: true });

const sqlite = new Database(DB_PATH);
// NOTE: journal_mode WAL bermasalah (disk I/O error) bila data dir berada di
// filesystem tersinkron (cth. iCloud Drive). DELETE aman untuk skala MVP.
sqlite.exec('PRAGMA journal_mode = DELETE;');
sqlite.exec('PRAGMA foreign_keys = ON;');

export const db: BunSQLiteDatabase<typeof schema> = drizzle(sqlite, { schema });

export function runMigrations() {
	migrate(db, { migrationsFolder: './drizzle' });
}
