import { defineConfig } from 'drizzle-kit';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// Dialect `turso` dipakai untuk kedua target: remote (libsql://) saat
// TURSO_DATABASE_URL diset, dan file lokal (file:...) saat tidak.
const url = process.env.TURSO_DATABASE_URL ?? localUrl();

function localUrl() {
	const path = process.env.DB_PATH ?? './data/app.db';
	// libsql gagal membuka file bila direktori induk belum ada.
	mkdirSync(dirname(path), { recursive: true });
	return `file:${path}`;
}

export default defineConfig({
	schema: './src/db/schema.ts',
	out: './drizzle',
	dialect: 'turso',
	dbCredentials: { url, authToken: process.env.TURSO_AUTH_TOKEN }
});
