import { Elysia, t } from 'elysia';
import { and, desc, eq, gte, isNull, lte, like } from 'drizzle-orm';
import { db } from '../db/client';
import { categories, expenses } from '../db/schema';
import { authDerive, jwtPlugin } from '../lib/auth';
import { fail, isValidDate, nowIso, ok, toExpense, uid } from '../lib/http';

const IdParam = t.Object({ id: t.String() });

async function ownCategory(userId: string, categoryId: string) {
	const rows = await db
		.select()
		.from(categories)
		.where(and(eq(categories.id, categoryId), eq(categories.userId, userId), eq(categories.isActive, 1)))
		.limit(1);
	return rows[0] ?? null;
}

async function ownExpense(userId: string, id: string) {
	const rows = await db
		.select()
		.from(expenses)
		.where(and(eq(expenses.id, id), eq(expenses.userId, userId), isNull(expenses.deletedAt)))
		.limit(1);
	return rows[0] ?? null;
}

export const expenseRoutes = new Elysia({ prefix: '/api/v1/expenses' })
	.use(jwtPlugin).derive(authDerive())
	.get('/', async ({ user, query }) => {
		const conds = [eq(expenses.userId, user.id), isNull(expenses.deletedAt)];
		if (query.from) conds.push(gte(expenses.transactionDate, query.from));
		if (query.to) conds.push(lte(expenses.transactionDate, query.to));
		if (query.category_id) conds.push(eq(expenses.categoryId, query.category_id));
		if (query.q) conds.push(like(expenses.description, `%${query.q}%`));
		const rows = await db
			.select()
			.from(expenses)
			.where(and(...conds))
			.orderBy(desc(expenses.transactionDate), desc(expenses.createdAt));
		return ok(rows.map(toExpense), { count: rows.length });
	})
	.post(
		'/',
		async ({ user, body, status, set }) => {
			if (!Number.isInteger(body.amount) || body.amount <= 0) {
				return status(400, fail('EXPENSE_AMOUNT_INVALID', 'Nominal pengeluaran harus lebih dari 0', { amount: 'Harus lebih dari 0' }, 400).body);
			}
			if (!isValidDate(body.transaction_date)) {
				return status(400, fail('EXPENSE_DATE_INVALID', 'Tanggal transaksi tidak valid', { transaction_date: 'Format YYYY-MM-DD' }, 400).body);
			}
			if (!body.description.trim()) {
				return status(400, fail('EXPENSE_DESCRIPTION_REQUIRED', 'Keterangan wajib diisi', { description: 'Wajib diisi' }, 400).body);
			}
			const cat = await ownCategory(user.id, body.category_id);
			if (!cat) return status(400, fail('EXPENSE_CATEGORY_INVALID', 'Kategori tidak valid', { category_id: 'Tidak ditemukan/aktif' }, 400).body);
			const now = nowIso();
			const id = uid('exp');
			await db.insert(expenses).values({
				id,
				userId: user.id,
				categoryId: body.category_id,
				amount: body.amount,
				description: body.description.trim(),
				note: body.note?.trim() || null,
				transactionDate: body.transaction_date,
				paymentMethod: body.payment_method || null,
				createdAt: now,
				updatedAt: now,
				deletedAt: null
			});
			const rows = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
			set.status = 201;
			return ok(toExpense(rows[0]!));
		},
		{
			body: t.Object({
				amount: t.Number(),
				category_id: t.String(),
				description: t.String(),
				transaction_date: t.String(),
				note: t.Optional(t.String()),
				payment_method: t.Optional(t.String())
			})
		}
	)
	.get('/:id', async ({ user, params, status }) => {
		const row = await ownExpense(user.id, params.id);
		if (!row) return status(404, fail('EXPENSE_NOT_FOUND', 'Transaksi tidak ditemukan', undefined, 404).body);
		return ok(toExpense(row));
	})
	.patch(
		'/:id',
		async ({ user, params, body, status }) => {
			const row = await ownExpense(user.id, params.id);
			if (!row) return status(404, fail('EXPENSE_NOT_FOUND', 'Transaksi tidak ditemukan', undefined, 404).body);
			if (body.amount !== undefined && (!Number.isInteger(body.amount) || body.amount <= 0)) {
				return status(400, fail('EXPENSE_AMOUNT_INVALID', 'Nominal pengeluaran harus lebih dari 0', undefined, 400).body);
			}
			if (body.category_id !== undefined && !(await ownCategory(user.id, body.category_id))) {
				return status(400, fail('EXPENSE_CATEGORY_INVALID', 'Kategori tidak valid', undefined, 400).body);
			}
			if (body.transaction_date !== undefined && !isValidDate(body.transaction_date)) {
				return status(400, fail('EXPENSE_DATE_INVALID', 'Tanggal transaksi tidak valid', undefined, 400).body);
			}
			await db
				.update(expenses)
				.set({
					amount: body.amount ?? row.amount,
					categoryId: body.category_id ?? row.categoryId,
					description: (body.description ?? row.description).trim(),
					note: body.note !== undefined ? body.note?.trim() || null : row.note,
					transactionDate: body.transaction_date ?? row.transactionDate,
					paymentMethod: body.payment_method !== undefined ? body.payment_method || null : row.paymentMethod,
					updatedAt: nowIso()
				})
				.where(eq(expenses.id, row.id));
			const updated = await db.select().from(expenses).where(eq(expenses.id, row.id)).limit(1);
			return ok(toExpense(updated[0]!));
		},
		{
			params: IdParam,
			body: t.Object({
				amount: t.Optional(t.Number()),
				category_id: t.Optional(t.String()),
				description: t.Optional(t.String()),
				transaction_date: t.Optional(t.String()),
				note: t.Optional(t.String()),
				payment_method: t.Optional(t.String())
			})
		}
	)
	.delete('/:id', async ({ user, params, status }) => {
		const row = await ownExpense(user.id, params.id);
		if (!row) return status(404, fail('EXPENSE_NOT_FOUND', 'Transaksi tidak ditemukan', undefined, 404).body);
		// Soft delete — histori tetap ada untuk audit (PRD §5.2C).
		await db.update(expenses).set({ deletedAt: nowIso(), updatedAt: nowIso() }).where(eq(expenses.id, row.id));
		return ok({ deleted: true, id: row.id });
	});
