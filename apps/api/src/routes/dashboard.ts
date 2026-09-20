import { Elysia, t } from 'elysia';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../db/client';
import { categories, expenses } from '../db/schema';
import { authDerive, jwtPlugin } from '../lib/auth';
import { byCategory, catMeta, dailySeries, inDay, inMonth, sum, type CatRow, type ExpRow } from '../lib/analytics';
import { isValidMonth, ok, toExpense } from '../lib/http';

export async function loadUserData(userId: string): Promise<{ rows: ExpRow[]; cats: CatRow[] }> {
	const eRows = await db
		.select()
		.from(expenses)
		.where(and(eq(expenses.userId, userId), isNull(expenses.deletedAt)));
	const cRows = await db.select().from(categories).where(eq(categories.userId, userId));
	return {
		rows: eRows.map((e) => ({
			id: e.id,
			categoryId: e.categoryId,
			amount: e.amount,
			description: e.description,
			transactionDate: e.transactionDate,
			createdAt: e.createdAt
		})),
		cats: cRows.map((c) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color }))
	};
}

function todayJakarta() {
	const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
	return parts; // YYYY-MM-DD
}

export const dashboardRoutes = new Elysia({ prefix: '/api/v1/dashboard' }).use(jwtPlugin).derive(authDerive()).get(
	'/summary',
	async ({ user, query }) => {
		const month = query.month && isValidMonth(query.month) ? query.month : todayJakarta().slice(0, 7);
		const today = query.today ?? todayJakarta();
		const { rows, cats } = await loadUserData(user.id);
		const todayRows = inDay(rows, today);
		const monthRows = inMonth(rows, month);
		const topToday = byCategory(todayRows)[0] ?? null;
		const recent = await db
			.select()
			.from(expenses)
			.where(and(eq(expenses.userId, user.id), isNull(expenses.deletedAt)))
			.orderBy(desc(expenses.transactionDate), desc(expenses.createdAt))
			.limit(8);
		return ok({
			today_total: sum(todayRows),
			today_count: todayRows.length,
			today_top_category: topToday ? { ...topToday, category: catMeta(cats, topToday.category_id) } : null,
			month_total: sum(monthRows),
			month_count: monthRows.length,
			daily_series: dailySeries(rows, month),
			recent: recent.map(toExpense),
			top_categories: byCategory(monthRows)
				.slice(0, 5)
				.map((c) => ({ ...c, category: catMeta(cats, c.category_id) }))
		});
	},
	{ query: t.Object({ month: t.Optional(t.String()), today: t.Optional(t.String()) }) }
);

export const trendRoutes = new Elysia({ prefix: '/api/v1/trends' })
	.use(jwtPlugin).derive(authDerive())
	.get('/daily', async ({ user, query }) => {
		const { rows } = await loadUserData(user.id);
		return ok(dailySeries(rows, query.month));
	}, { query: t.Object({ month: t.String() }) })
	.get('/monthly', async ({ user, query }) => {
		const { rows } = await loadUserData(user.id);
		const { monthlySeries } = await import('../lib/analytics');
		const { prevMonth } = await import('../lib/http');
		return ok(monthlySeries(rows, query.n ?? 6, query.month, prevMonth));
	}, { query: t.Object({ month: t.String(), n: t.Optional(t.Number({ minimum: 1, maximum: 24 })) }) })
	.get('/categories', async ({ user, query }) => {
		const { rows, cats } = await loadUserData(user.id);
		return ok(
			byCategory(inMonth(rows, query.month)).map((c) => ({ ...c, category: catMeta(cats, c.category_id) }))
		);
	}, { query: t.Object({ month: t.String() }) });
