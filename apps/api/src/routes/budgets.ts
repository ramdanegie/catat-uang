import { Elysia, t } from 'elysia';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { budgetCategories, monthlyBudgets } from '../db/schema';
import { authDerive, jwtPlugin } from '../lib/auth';
import { loadUserData } from './dashboard';
import { usageOf } from '../lib/analytics';
import { fail, isValidMonth, nowIso, ok, uid } from '../lib/http';

async function findBudget(userId: string, month: string) {
	const rows = await db
		.select()
		.from(monthlyBudgets)
		.where(and(eq(monthlyBudgets.userId, userId), eq(monthlyBudgets.month, month)))
		.limit(1);
	return rows[0] ?? null;
}

async function budgetItems(budgetId: string) {
	return db.select().from(budgetCategories).where(eq(budgetCategories.budgetId, budgetId));
}

const withItems = async (b: typeof monthlyBudgets.$inferSelect) => ({
	id: b.id,
	user_id: b.userId,
	month: b.month,
	total_amount: b.totalAmount,
	items: (await budgetItems(b.id)).map((i) => ({
		id: i.id,
		budget_id: i.budgetId,
		category_id: i.categoryId,
		amount: i.amount
	}))
});

export const budgetRoutes = new Elysia({ prefix: '/api/v1/budgets' })
	.use(jwtPlugin).derive(authDerive())
	.get('/', async ({ user }) => {
		const all = await db.select().from(monthlyBudgets).where(eq(monthlyBudgets.userId, user.id));
		return ok(await Promise.all(all.map(withItems)));
	})
	.get('/:month', async ({ user, params, status }) => {
		if (!isValidMonth(params.month)) return status(400, fail('BUDGET_MONTH_INVALID', 'Format bulan YYYY-MM', undefined, 400).body);
		const b = await findBudget(user.id, params.month);
		if (!b) return ok(null, { month: params.month, has_budget: false });
		return ok(await withItems(b), { month: params.month, has_budget: true });
	})
	.post(
		'/',
		async ({ user, body, status }) => {
			if (!isValidMonth(body.month)) return status(400, fail('BUDGET_MONTH_INVALID', 'Format bulan YYYY-MM', undefined, 400).body);
			if (!Number.isInteger(body.total_amount) || body.total_amount <= 0) {
				return status(400, fail('BUDGET_TOTAL_INVALID', 'Total budget harus lebih dari 0', undefined, 400).body);
			}
			const now = nowIso();
			let budget = await findBudget(user.id, body.month);
			if (budget) {
				await db.update(monthlyBudgets).set({ totalAmount: body.total_amount, updatedAt: now }).where(eq(monthlyBudgets.id, budget.id));
				await db.delete(budgetCategories).where(eq(budgetCategories.budgetId, budget.id));
			} else {
				budget = {
					id: uid('bud'),
					userId: user.id,
					month: body.month,
					totalAmount: body.total_amount,
					createdAt: now,
					updatedAt: now
				};
				await db.insert(monthlyBudgets).values(budget);
			}
			const items = (body.items ?? []).filter((i) => Number.isInteger(i.amount) && i.amount > 0);
			if (items.length > 0) {
				await db.insert(budgetCategories).values(
					items.map((i) => ({
						id: uid('bc'),
						budgetId: budget!.id,
						categoryId: i.category_id,
						amount: i.amount,
						createdAt: now,
						updatedAt: now
					}))
				);
			}
			return ok(await withItems({ ...budget, totalAmount: body.total_amount }));
		},
		{
			body: t.Object({
				month: t.String(),
				total_amount: t.Number(),
				items: t.Optional(t.Array(t.Object({ category_id: t.String(), amount: t.Number() })))
			})
		}
	)
	.patch(
		'/:id',
		async ({ user, params, body, status }) => {
			const rows = await db.select().from(monthlyBudgets).where(eq(monthlyBudgets.id, params.id)).limit(1);
			const b = rows[0];
			if (!b || b.userId !== user.id) return status(404, fail('BUDGET_NOT_FOUND', 'Budget tidak ditemukan', undefined, 404).body);
			if (body.total_amount !== undefined && (!Number.isInteger(body.total_amount) || body.total_amount <= 0)) {
				return status(400, fail('BUDGET_TOTAL_INVALID', 'Total budget harus lebih dari 0', undefined, 400).body);
			}
			const now = nowIso();
			await db
				.update(monthlyBudgets)
				.set({ totalAmount: body.total_amount ?? b.totalAmount, updatedAt: now })
				.where(eq(monthlyBudgets.id, b.id));
			if (body.items !== undefined) {
				await db.delete(budgetCategories).where(eq(budgetCategories.budgetId, b.id));
				const items = body.items.filter((i) => Number.isInteger(i.amount) && i.amount > 0);
				if (items.length > 0) {
					await db.insert(budgetCategories).values(
						items.map((i) => ({ id: uid('bc'), budgetId: b.id, categoryId: i.category_id, amount: i.amount, createdAt: now, updatedAt: now }))
					);
				}
			}
			const fresh = await db.select().from(monthlyBudgets).where(eq(monthlyBudgets.id, b.id)).limit(1);
			return ok(await withItems(fresh[0]!));
		},
		{
			body: t.Object({
				total_amount: t.Optional(t.Number()),
				items: t.Optional(t.Array(t.Object({ category_id: t.String(), amount: t.Number() })))
			})
		}
	)
	.get('/:month/usage', async ({ user, params, status }) => {
		if (!isValidMonth(params.month)) return status(400, fail('BUDGET_MONTH_INVALID', 'Format bulan YYYY-MM', undefined, 400).body);
		const b = await findBudget(user.id, params.month);
		const { rows } = await loadUserData(user.id);
		if (!b) return ok({ used: 0, pct: 0, remaining: 0, status: 'normal', perCategory: [] }, { month: params.month, has_budget: false });
		const items = await budgetItems(b.id);
		const usage = usageOf(rows, { id: b.id, totalAmount: b.totalAmount, month: b.month }, items.map((i) => ({ budgetId: i.budgetId, categoryId: i.categoryId, amount: i.amount })));
		return ok(usage, { month: params.month, has_budget: true });
	});
