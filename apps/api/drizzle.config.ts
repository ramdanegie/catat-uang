import { defineConfig } from 'drizzle-kit';

// Dialect `turso` dipakai untuk kedua target: remote (libsql://) saat
// TURSO_DATABASE_URL diset, dan file lokal (file:...) saat tidak.
const url = process.env.TURSO_DATABASE_URL ?? `file:${process.env.DB_PATH ?? './data/app.db'}`;

export default defineConfig({
	schema: './src/db/schema.ts',
	out: './drizzle',
	dialect: 'turso',
	dbCredentials: { url, authToken: process.env.TURSO_AUTH_TOKEN }
});
