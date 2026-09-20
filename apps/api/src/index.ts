// Entry Bun / Docker: migrasi + serve frontend statis + listen.
// Definisi rute ada di src/app.ts (dipakai bersama entry Vercel).
import { statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { app } from './app';
import { runMigrations } from './db/client';
import { fail } from './lib/http';

const PORT = Number(process.env.PORT ?? 3000);

// Web UI: diserve dari hasil build frontend (apps/web/build).
// Dibangun via `bun run build:web`. Bila belum ada, API tetap jalan mandiri.
const WEB_DIR = process.env.STATIC_DIR ?? resolve(import.meta.dir, '../../web/build');
const WEB_INDEX = join(WEB_DIR, 'index.html');
const hasWeb = await Bun.file(WEB_INDEX).exists();

await runMigrations();

if (hasWeb) {
	// SPA fallback: aset statis bila ada, selain itu index.html (client routing).
	// Didaftarkan TERAKHIR agar rute /api/* dan /health tidak tertimpa.
	app.get('/*', async ({ params, set }) => {
		const star = (params as Record<string, string>)['*'] ?? '';
		if (star === 'api' || star.startsWith('api/') || star === 'health') {
			set.status = 404;
			return fail('NOT_FOUND', 'Rute tidak ditemukan', undefined, 404).body;
		}
		if (star) {
			const candidate = join(WEB_DIR, star);
			if (candidate.startsWith(WEB_DIR + sep)) {
				const st = statSync(candidate, { throwIfNoEntry: false });
				if (st?.isFile()) return new Response(Bun.file(candidate));
			}
		}
		return new Response(Bun.file(WEB_INDEX));
	});
}

app.listen(PORT);

console.log(`Catat Uang Hemat API running at http://localhost:${PORT}`);
console.log(`Docs: PRD §13 — base path /api/v1 · health at /health`);
console.log(hasWeb ? `Web UI served from ${WEB_DIR} (satu service)` : 'Web UI belum di-build — jalankan `bun run build:web`');
if ((process.env.JWT_SECRET ?? 'dev-secret-change-me') === 'dev-secret-change-me') {
	console.warn('WARNING: memakai JWT_SECRET default — wajib set JWT_SECRET yang kuat di production!');
}

export type { App } from './app';
