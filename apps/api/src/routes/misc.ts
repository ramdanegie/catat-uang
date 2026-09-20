import { Elysia, t } from 'elysia';
import { and, desc, eq, gte, isNull, lte } from 'drizzle-orm';
import { db } from '../db/client';
import { categories, expenses, reminderPreferences } from '../db/schema';
import { authDerive, jwtPlugin } from '../lib/auth';
import { loadUserData } from './dashboard';
import { byCategory, catMeta, sum } from '../lib/analytics';
import { fail, nowIso, ok, toExpense, uid } from '../lib/http';

const toReminder = (r: typeof reminderPreferences.$inferSelect) => ({
	daily_enabled: r.dailyEnabled === 1,
	daily_time: r.dailyTime,
	weekly_enabled: r.weeklyEnabled === 1,
	weekly_day: r.weeklyDay,
	weekly_time: r.weeklyTime
});

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const reminderRoutes = new Elysia({ prefix: '/api/v1/reminders' })
	.use(jwtPlugin).derive(authDerive())
	.get('/', async ({ user }) => {
		const rows = await db.select().from(reminderPreferences).where(eq(reminderPreferences.userId, user.id)).limit(1);
		if (!rows[0]) return ok({ daily_enabled: true, daily_time: '20:00', weekly_enabled: true, weekly_day: 'Minggu', weekly_time: '19:00' });
		return ok(toReminder(rows[0]));
	})
	.put(
		'/',
		async ({ user, body, status }) => {
			for (const [k, v] of [['daily_time', body.daily_time], ['weekly_time', body.weekly_time]] as const) {
				if (v !== undefined && !TIME_RE.test(v)) return status(400, fail('REMINDER_TIME_INVALID', `Format jam ${k} HH:mm`, undefined, 400).body);
			}
			const now = nowIso();
			const existing = await db.select().from(reminderPreferences).where(eq(reminderPreferences.userId, user.id)).limit(1);
			const values = {
				dailyEnabled: body.daily_enabled ? 1 : 0,
				dailyTime: body.daily_time ?? existing[0]?.dailyTime ?? '20:00',
				weeklyEnabled: body.weekly_enabled ? 1 : 0,
				weeklyDay: body.weekly_day ?? existing[0]?.weeklyDay ?? 'Minggu',
				weeklyTime: body.weekly_time ?? existing[0]?.weeklyTime ?? '19:00',
				updatedAt: now
			};
			if (existing[0]) {
				await db.update(reminderPreferences).set(values).where(eq(reminderPreferences.id, existing[0].id));
			} else {
				await db.insert(reminderPreferences).values({ id: uid('rem'), userId: user.id, ...values });
			}
			const fresh = await db.select().from(reminderPreferences).where(eq(reminderPreferences.userId, user.id)).limit(1);
			return ok(toReminder(fresh[0]!));
		},
		{
			body: t.Object({
				daily_enabled: t.Boolean(),
				daily_time: t.Optional(t.String()),
				weekly_enabled: t.Boolean(),
				weekly_day: t.Optional(t.String()),
				weekly_time: t.Optional(t.String())
			})
		}
	)
	.post('/test', async ({ user }) => {
		const rows = await db.select().from(reminderPreferences).where(eq(reminderPreferences.userId, user.id)).limit(1);
		const prefs = rows[0] ? toReminder(rows[0]) : null;
		if (!prefs?.daily_enabled) return ok({ sent: false, message: 'Pengingat harian nonaktif.' });
		return ok({ sent: true, message: `Notifikasi terkirim: "Sudah mencatat pengeluaran hari ini?" (${prefs.daily_time})` });
	})
	.get('/weekly-summary', async ({ user, query }) => {
		// Ringkasan 7 hari terakhir + 7 hari sebelumnya sebagai pembanding.
		const end = query.today ?? new Date().toISOString().slice(0, 10);
		const d = (iso: string, delta: number) => {
			const t = new Date(iso + 'T00:00:00');
			t.setDate(t.getDate() + delta);
			return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
		};
		const start = d(end, -6);
		const pEnd = d(start, -1);
		const pStart = d(start, -7);
		const { rows, cats } = await loadUserData(user.id);
		const cur = rows.filter((e) => e.transactionDate >= start && e.transactionDate <= end);
		const prev = rows.filter((e) => e.transactionDate >= pStart && e.transactionDate <= pEnd);
		const top = byCategory(cur)[0] ?? null;
		return ok({
			start,
			end,
			total: sum(cur),
			count: cur.length,
			top: top ? { ...top, category: catMeta(cats, top.category_id) } : null,
			prev_total: sum(prev),
			delta: sum(cur) - sum(prev)
		});
	});

export const exportRoutes = new Elysia({ prefix: '/api/v1/exports' }).use(jwtPlugin).derive(authDerive()).post(
	'/expenses',
	async ({ user, body }) => {
		const conds = [eq(expenses.userId, user.id), isNull(expenses.deletedAt)];
		if (body.from) conds.push(gte(expenses.transactionDate, body.from));
		if (body.to) conds.push(lte(expenses.transactionDate, body.to));
		const rows = await db
			.select({ e: expenses, catName: categories.name })
			.from(expenses)
			.leftJoin(categories, eq(expenses.categoryId, categories.id))
			.where(and(...conds))
			.orderBy(desc(expenses.transactionDate));
		const esc = (v: unknown) => {
			const s = v === null || v === undefined ? '' : String(v);
			return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
		};
		const header = 'transaction_id,date,description,category,amount,payment_method,created_at';
		const lines = rows.map(({ e, catName }) =>
			[e.id, e.transactionDate, e.description, catName ?? e.categoryId, e.amount, e.paymentMethod ?? '', e.createdAt].map(esc).join(',')
		);
		const csv = [header, ...lines].join('\n');
		return new Response(csv, {
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': `attachment; filename="catat-uang-${new Date().toISOString().slice(0, 10)}.csv"`
			}
		});
	},
	{ body: t.Object({ from: t.Optional(t.String()), to: t.Optional(t.String()) }) }
);
