// Definisi aplikasi Elysia tanpa ikatan runtime — tanpa `.listen()` dan tanpa
// serve file statis. Dipakai dua entry:
//   - src/index.ts        : Bun / Docker (listen + serve apps/web/build)
//   - ../../api/[...path] : Vercel Function (default export, Vercel pakai .fetch)
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { authRoutes } from './routes/auth';
import { categoryRoutes } from './routes/categories';
import { expenseRoutes } from './routes/expenses';
import { dashboardRoutes, trendRoutes } from './routes/dashboard';
import { budgetRoutes } from './routes/budgets';
import { insightRoutes, reviewRoutes } from './routes/reviews';
import { exportRoutes, reminderRoutes } from './routes/misc';
import { fail } from './lib/http';
import { UnauthorizedError } from './lib/auth';

export const app = new Elysia()
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
	// Alias: di Vercel hanya path /api/* yang sampai ke function, jadi
	// vercel.json me-rewrite /health ke sini.
	.get('/api/health', () => ({ status: 'ok' }))
	.use(authRoutes)
	.use(categoryRoutes)
	.use(expenseRoutes)
	.use(dashboardRoutes)
	.use(trendRoutes)
	.use(budgetRoutes)
	.use(reviewRoutes)
	.use(insightRoutes)
	.use(reminderRoutes)
	.use(exportRoutes);

export type App = typeof app;
export default app;
