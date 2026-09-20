import { createClient } from '@libsql/client';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from './schema';

// Satu driver (libSQL) untuk semua target:
// - lokal / Docker : file SQLite biasa (`file:./data/app.db`)
// - Vercel / serverless : Turso remote (`libsql://...` + auth token)
const remoteUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

function localUrl() {
	const path = process.env.DB_PATH ?? './data/app.db';
	if (path === ':memory:') return path;
	mkdirSync(dirname(path), { recursive: true });
	// Prefix `file:` wajib untuk libsql.
	return path.startsWith('file:') ? path : `file:${path}`;
}

export const isRemoteDb = Boolean(remoteUrl);

const client = createClient(
	remoteUrl ? { url: remoteUrl, authToken } : { url: localUrl() }
);

export const db: LibSQLDatabase<typeof schema> = drizzle(client, { schema });

// Hanya dipakai entry Bun/Docker. Di Vercel migrasi dijalankan saat build
// (`npm run db:migrate`), bukan per-invocation.
export async function runMigrations() {
	await migrate(db, { migrationsFolder: './drizzle' });
}
