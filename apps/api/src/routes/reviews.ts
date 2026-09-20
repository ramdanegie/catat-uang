import { Elysia, t } from 'elysia';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { monthlyBudgets, reviewNotes } from '../db/schema';
import { authDerive, jwtPlugin } from '../lib/auth';
import { loadUserData } from './dashboard';
import { byCategory, catMeta, inMonth, sum, usageOf } from '../lib/analytics';
import { generateInsights } from '../lib/insights';
import { fail, isValidMonth, nowIso, ok, prevMonth, uid } from '../lib/http';

export const reviewRoutes = new Elysia({ prefix: '/api/v1/reviews' })
	.use(jwtPlugin).derive(authDerive())
	.get('/notes', async ({ user }) => {
		const rows = await db.select().from(reviewNotes).where(eq(reviewNotes.userId, user.id));
		return ok(rows.map((r) => ({ id: r.id, user_id: r.userId, month: r.month, note: r.note, updated_at: r.updatedAt })));
	})
	.get('/:month', async ({ user, params, status }) => {
		if (!isValidMonth(params.month)) return status(400, fail('REVIEW_MONTH_INVALID', 'Format bulan YYYY-MM', undefined, 400).body);
		const { rows, cats } = await loadUserData(user.id);
		const mRows = inMonth(rows, params.month);
		const pRows = inMonth(rows, prevMonth(params.month));
		const curr = sum(mRows);
		const hasPrev = pRows.length > 0;
		const prev = sum(pRows);
		const days = new Date(Number(params.month.slice(0, 4)), Number(params.month.slice(5, 7)), 0).getDate();
		const dist = byCategory(mRows);
		const top = dist[0] ?? null;
		const budgets = await db
			.select()
			.from(monthlyBudgets)
			.where(and(eq(monthlyBudgets.userId, user.id), eq(monthlyBudgets.month, params.month)))
			.limit(1);
		return ok({
			month: params.month,
			current_total: curr,
			previous_total: hasPrev ? prev : null,
			absolute_change: hasPrev ? curr - prev : null,
			percentage_change: hasPrev && prev ? ((curr - prev) / prev) * 100 : null,
			transaction_count: mRows.length,
			average_daily: curr / days,
			top_category: top ? { ...top, category: catMeta(cats, top.category_id) } : null,
			by_category: dist.map((c) => ({ ...c, category: catMeta(cats, c.category_id) })),
			has_budget: !!budgets[0]
		});
	})
	.put(
		'/:month/note',
		async ({ user, params, body, status }) => {
			if (!isValidMonth(params.month)) return status(400, fail('REVIEW_MONTH_INVALID', 'Format bulan YYYY-MM', undefined, 400).body);
			const now = nowIso();
			const existing = await db
				.select()
				.from(reviewNotes)
				.where(and(eq(reviewNotes.userId, user.id), eq(reviewNotes.month, params.month)))
				.limit(1);
			if (existing[0]) {
				await db.update(reviewNotes).set({ note: body.note, updatedAt: now }).where(eq(reviewNotes.id, existing[0].id));
			} else {
				await db.insert(reviewNotes).values({ id: uid('rn'), userId: user.id, month: params.month, note: body.note, createdAt: now, updatedAt: now });
			}
			return ok({ month: params.month, note: body.note });
		},
		{ body: t.Object({ note: t.String() }) }
	);

export const insightRoutes = new Elysia({ prefix: '/api/v1/insights' }).use(jwtPlugin).derive(authDerive()).get('/:month', async ({ user, params, status }) => {
	if (!isValidMonth(params.month)) return status(400, fail('INSIGHT_MONTH_INVALID', 'Format bulan YYYY-MM', undefined, 400).body);
	const { rows, cats } = await loadUserData(user.id);
	const budgets = await db
		.select()
		.from(monthlyBudgets)
		.where(and(eq(monthlyBudgets.userId, user.id), eq(monthlyBudgets.month, params.month)))
		.limit(1);
	const b = budgets[0];
	const insights = generateInsights(
		rows.map((r) => ({ categoryId: r.categoryId, amount: r.amount, transactionDate: r.transactionDate })),
		cats,
		params.month,
		b ? { totalAmount: b.totalAmount } : null
	);
	return ok(insights, { month: params.month, count: insights.length });
});
