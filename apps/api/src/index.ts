import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { runMigrations } from './db/client';
import { authRoutes } from './routes/auth';
import { categoryRoutes } from './routes/categories';
import { expenseRoutes } from './routes/expenses';
import { dashboardRoutes, trendRoutes } from './routes/dashboard';
import { budgetRoutes } from './routes/budgets';
import { insightRoutes, reviewRoutes } from './routes/reviews';
import { exportRoutes, reminderRoutes } from './routes/misc';
import { fail } from './lib/http';
import { UnauthorizedError } from './lib/auth';

const PORT = Number(process.env.PORT ?? 3000);

// Web UI: diserve dari hasil build frontend (apps/web/build).
// Dibangun via `bun run build:web`. Bila belum ada, API tetap jalan mandiri.
const WEB_DIR = process.env.STATIC_DIR ?? resolve(import.meta.dir, '../../web/build');
const WEB_INDEX = join(WEB_DIR, 'index.html');
const hasWeb = await Bun.file(WEB_INDEX).exists();

runMigrations();

const app = new Elysia()
	.use(cors({ origin: true }))
	.onError(({ code, error, set }) => {
		if (error instanceof UnauthorizedError) {
			set.status = 401;
			return fail('UNAUTHORIZED', 'Token tidak valid atau kedaluwarsa', undefined, 401).body;
		}
		if (code === 'VALIDATION') {
			set.status = 400;
			return fail('VALIDATION_ERROR', 'Payload tidak valid', undefined, 400).body;
		}
		if (code === 'NOT_FOUND') {
			set.status = 404;
			return fail('NOT_FOUND', 'Rute tidak ditemukan', undefined, 404).body;
		}
		console.error(`[${code}]`, error);
	})
	.get('/health', () => ({ status: 'ok' }))
	.use(authRoutes)
	.use(categoryRoutes)
	.use(expenseRoutes)
	.use(dashboardRoutes)
	.use(trendRoutes)
	.use(budgetRoutes)
	.use(reviewRoutes)
	.use(insightRoutes)
	.use(reminderRoutes)
	.use(exportRoutes)
	.listen(PORT);

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

console.log(`Catat Uang Hemat API running at http://localhost:${PORT}`);
console.log(`Docs: PRD §13 — base path /api/v1 · health at /health`);
console.log(hasWeb ? `Web UI served from ${WEB_DIR} (satu service)` : 'Web UI belum di-build — jalankan `bun run build:web`');
if ((process.env.JWT_SECRET ?? 'dev-secret-change-me') === 'dev-secret-change-me') {
	console.warn('WARNING: memakai JWT_SECRET default — wajib set JWT_SECRET yang kuat di production!');
}

export type App = typeof app;
