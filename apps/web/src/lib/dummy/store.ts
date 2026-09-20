import { derived, get, writable, type Readable, type Writable } from 'svelte/store';
import type {
	BudgetCategory,
	Category,
	DummyUser,
	Expense,
	MonthlyBudget,
	ReminderPrefs,
	ReviewNote
} from './types';
import { DEFAULT_CATEGORIES, DEFAULT_REMINDERS, currentMonthKey, seedBudgets, seedExpenses, todayKey } from './seed';
import { uid } from '$lib/utils/format';
import { api, apiMode, getToken, setToken } from '$lib/api/client';

export { apiMode };

const DEMO_USER: DummyUser = {
	id: 'user-demo-1',
	name: 'Pengguna Demo',
	email: 'demo@catatuang.id',
	currency: 'IDR',
	timezone: 'Asia/Jakarta',
	theme: 'system'
};

function persisted<T>(key: string, init: () => T): Writable<T> {
	const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
	const store = writable<T>(stored ? (JSON.parse(stored) as T) : init());
	store.subscribe((v) => {
		try {
			localStorage.setItem(key, JSON.stringify(v));
		} catch {
			/* ignore quota */
		}
	});
	return store;
}

// ── Auth ────────────────────────────────────────────────────────────────────
// Mode dummy: auth lokal (localStorage). Mode API: JWT backend + sync data.
export const authUser: Writable<DummyUser | null> = persisted<DummyUser | null>(
	'cuh.authUser',
	() => null
);

type MeResponse = {
	user: { id: string; name: string; email: string; currency: string; timezone: string; avatar_url?: string | null };
	token?: string;
};

function toUser(u: MeResponse['user']): DummyUser {
	const t = get(prefs).theme;
	const theme = t === 'light' || t === 'dark' || t === 'system' ? t : 'system';
	return { ...u, avatar_url: u.avatar_url ?? null, theme };
}

// Dipakai oleh halaman callback Google untuk menerapkan sesi.
export function applyMeUser(u: MeResponse['user']) {
	authUser.set(toUser(u));
}

export async function dummyLogin(email: string, password?: string) {
	if (!apiMode) {
		const u: DummyUser = { ...DEMO_USER, email: email || DEMO_USER.email };
		authUser.set(u);
		ensureSeeded(u.id);
		return;
	}
	const data = await api<MeResponse>('/api/v1/auth/login', {
		method: 'POST',
		auth: false,
		body: { email, password: password ?? '' }
	});
	setToken(data.token ?? null);
	authUser.set(toUser(data.user));
	await syncFromBackend();
}

export async function dummyRegister(name: string, email: string, password?: string) {
	if (!apiMode) {
		dummyLogin(email, name);
		return;
	}
	const data = await api<MeResponse>('/api/v1/auth/register', {
		method: 'POST',
		auth: false,
		body: { name, email, password: password ?? '' }
	});
	setToken(data.token ?? null);
	authUser.set(toUser(data.user));
	await syncFromBackend();
}

export async function dummyLogout() {
	if (apiMode) {
		try {
			await api('/api/v1/auth/logout', { method: 'POST' });
		} catch {
			/* abaikan — token dibuang lokal */
		}
		setToken(null);
		authUser.set(null);
		clearServerCache();
		return;
	}
	authUser.set(null);
}

// Pulihkan sesi saat reload (mode API): token -> /me -> sync.
export async function restoreSession(): Promise<boolean> {
	if (!apiMode || !getToken() || get(authUser)) return !!get(authUser);
	try {
		const data = await api<{ user: MeResponse['user'] }>('/api/v1/auth/me');
		authUser.set(toUser(data.user));
		await syncFromBackend();
		return true;
	} catch {
		setToken(null);
		authUser.set(null);
		return false;
	}
}

export async function renameUser(name: string) {
	authUser.update((u) => (u ? { ...u, name } : u));
	if (apiMode && getToken()) {
		try {
			const data = await api<{ user: MeResponse['user'] }>('/api/v1/auth/me', { method: 'PATCH', body: { name } });
			authUser.set(toUser(data.user));
		} catch {
			/* nama lokal tetap tersimpan */
		}
	}
}

// ── Categories ──────────────────────────────────────────────────────────────
export const categories: Writable<Category[]> = writable(apiMode ? [] : DEFAULT_CATEGORIES);

// ── Expenses ────────────────────────────────────────────────────────────────
function initExpenses(): Expense[] {
	if (apiMode) return []; // diisi syncFromBackend setelah login
	return seedExpenses(DEMO_USER.id, new Date());
}
export const expenses: Writable<Expense[]> = persisted<Expense[]>('cuh.expenses.v1', initExpenses);

function ensureSeeded(userId: string) {
	if (apiMode) return;
	expenses.update((list) => {
		if (list && list.length > 0) return list;
		return seedExpenses(userId, new Date());
	});
	budgets.update((b) => {
		if (b && b.length > 0) return b;
		return seedBudgets(userId, new Date()).budgets;
	});
	budgetItems.update((it) => {
		if (it && it.length > 0) return it;
		return seedBudgets(userId, new Date()).items;
	});
}

function clearServerCache() {
	expenses.set([]);
	budgets.set([]);
	budgetItems.set([]);
	reviewNotes.set([]);
	categories.set([]);
	reminders.set({ ...DEFAULT_REMINDERS });
}

export async function syncFromBackend() {
	const [cats, exps, buds, notes, rems] = await Promise.all([
		api<Category[]>('/api/v1/categories'),
		api<Expense[]>('/api/v1/expenses'),
		api<{ id: string; user_id: string; month: string; total_amount: number; items: BudgetCategory[] }[]>('/api/v1/budgets'),
		api<ReviewNote[]>('/api/v1/reviews/notes'),
		api<ReminderPrefs>('/api/v1/reminders')
	]);
	categories.set(cats);
	expenses.set(exps);
	budgets.set(buds.map((b) => ({ id: b.id, user_id: b.user_id, month: b.month, total_amount: b.total_amount })));
	budgetItems.set(buds.flatMap((b) => b.items));
	reviewNotes.set(notes);
	suppressReminderSync = true;
	reminders.set(rems);
	suppressReminderSync = false;
}

export const activeExpenses: Readable<Expense[]> = derived(expenses, ($e) =>
	$e.filter((x) => !x.deleted_at).sort((a, b) => (`${a.transaction_date}${a.created_at}` < `${b.transaction_date}${b.created_at}` ? 1 : -1))
);

type ExpenseInput = Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'> & { user_id?: string };

export async function addExpense(input: ExpenseInput) {
	if (apiMode) {
		const created = await api<Expense>('/api/v1/expenses', {
			method: 'POST',
			body: {
				amount: input.amount,
				category_id: input.category_id,
				description: input.description,
				transaction_date: input.transaction_date,
				note: input.note,
				payment_method: input.payment_method
			}
		});
		expenses.update((list) => [created, ...list]);
		return created;
	}
	const now = new Date().toISOString();
	const exp: Expense = {
		id: uid('exp'),
		user_id: input.user_id ?? DEMO_USER.id,
		created_at: now,
		updated_at: now,
		deleted_at: null,
		...input
	};
	expenses.update((list) => [exp, ...list]);
	return exp;
}

export async function updateExpense(id: string, patch: Partial<Expense>) {
	if (apiMode) {
		const updated = await api<Expense>(`/api/v1/expenses/${id}`, {
			method: 'PATCH',
			body: {
				...(patch.amount !== undefined ? { amount: patch.amount } : {}),
				...(patch.category_id !== undefined ? { category_id: patch.category_id } : {}),
				...(patch.description !== undefined ? { description: patch.description } : {}),
				...(patch.transaction_date !== undefined ? { transaction_date: patch.transaction_date } : {}),
				...(patch.note !== undefined ? { note: patch.note ?? '' } : {}),
				...(patch.payment_method !== undefined ? { payment_method: patch.payment_method ?? '' } : {})
			}
		});
		expenses.update((list) => list.map((e) => (e.id === id ? updated : e)));
		return;
	}
	expenses.update((list) =>
		list.map((e) => (e.id === id ? { ...e, ...patch, updated_at: new Date().toISOString() } : e))
	);
}

export async function softDeleteExpense(id: string) {
	if (apiMode) {
		await api(`/api/v1/expenses/${id}`, { method: 'DELETE' });
		expenses.update((list) =>
			list.map((e) => (e.id === id ? { ...e, deleted_at: new Date().toISOString() } : e))
		);
		return;
	}
	updateExpense(id, { deleted_at: new Date().toISOString() });
}

export function resetDemoData() {
	if (apiMode) return; // data milik server; tidak di-reset dari client
	if (typeof localStorage !== 'undefined') {
		localStorage.removeItem('cuh.expenses.v1');
		localStorage.removeItem('cuh.budgets.v1');
		localStorage.removeItem('cuh.budgetItems.v1');
		localStorage.removeItem('cuh.reviewNotes.v1');
		localStorage.removeItem('cuh.reminders.v1');
		localStorage.removeItem('cuh.prefs.v1');
	}
	expenses.set(seedExpenses(DEMO_USER.id, new Date()));
	const s = seedBudgets(DEMO_USER.id, new Date());
	budgets.set(s.budgets);
	budgetItems.set(s.items);
	reviewNotes.set([]);
	reminders.set(DEFAULT_REMINDERS);
}

// ── Budgets ─────────────────────────────────────────────────────────────────
export const budgets: Writable<MonthlyBudget[]> = persisted<MonthlyBudget[]>(
	'cuh.budgets.v1',
	() => (apiMode ? [] : seedBudgets(DEMO_USER.id, new Date()).budgets)
);
export const budgetItems: Writable<BudgetCategory[]> = persisted<BudgetCategory[]>(
	'cuh.budgetItems.v1',
	() => (apiMode ? [] : seedBudgets(DEMO_USER.id, new Date()).items)
);

export async function upsertBudget(month: string, total: number, perCategory: { category_id: string; amount: number }[]) {
	if (apiMode) {
		const saved = await api<{ id: string; user_id: string; month: string; total_amount: number; items: BudgetCategory[] }>('/api/v1/budgets', {
			method: 'POST',
			body: { month, total_amount: total, items: perCategory.filter((p) => p.amount > 0) }
		});
		budgets.update((list) => {
			const rest = list.filter((b) => b.month !== month);
			return [...rest, { id: saved.id, user_id: saved.user_id, month: saved.month, total_amount: saved.total_amount }];
		});
		budgetItems.update((items) => [...items.filter((i) => i.budget_id !== saved.id), ...saved.items]);
		return;
	}
	let budgetId = '';
	budgets.update((list) => {
		const found = list.find((b) => b.month === month);
		if (found) {
			budgetId = found.id;
			return list.map((b) => (b.month === month ? { ...b, total_amount: total } : b));
		}
		budgetId = uid('bud');
		return [...list, { id: budgetId, user_id: DEMO_USER.id, month, total_amount: total }];
	});
	budgetItems.update((items) => {
		const rest = items.filter((i) => i.budget_id !== budgetId);
		const fresh = perCategory
			.filter((p) => p.amount > 0)
			.map((p) => ({ id: uid('bc'), budget_id: budgetId, category_id: p.category_id, amount: p.amount }));
		return [...rest, ...fresh];
	});
}

// ── Review notes ────────────────────────────────────────────────────────────
export const reviewNotes: Writable<ReviewNote[]> = persisted<ReviewNote[]>('cuh.reviewNotes.v1', () =>
	apiMode
		? []
		: [
				{
					id: 'rn-prev',
					user_id: DEMO_USER.id,
					month: '2026-08',
					note: 'Bulan lalu pengeluaran transportasi naik karena perjalanan dinas ke Bandung.',
					updated_at: '2026-08-31T20:00:00'
				}
			]
);

export async function saveReviewNote(month: string, note: string) {
	if (apiMode) {
		await api(`/api/v1/reviews/${month}/note`, { method: 'PUT', body: { note } });
	}
	reviewNotes.update((list) => {
		const found = list.find((r) => r.month === month);
		if (found) return list.map((r) => (r.month === month ? { ...r, note, updated_at: new Date().toISOString() } : r));
		return [...list, { id: uid('rn'), user_id: get(authUser)?.id ?? DEMO_USER.id, month, note, updated_at: new Date().toISOString() }];
	});
}

// ── Reminders & prefs ───────────────────────────────────────────────────────
// Mode API: perubahan reminders otomatis di-PUT ke server (debounced).
let suppressReminderSync = false;
let reminderTimer: ReturnType<typeof setTimeout> | null = null;

export const reminders: Writable<ReminderPrefs> = persisted<ReminderPrefs>('cuh.reminders.v1', () => ({ ...DEFAULT_REMINDERS }));

reminders.subscribe((v) => {
	if (!apiMode || suppressReminderSync || !getToken()) return;
	if (reminderTimer) clearTimeout(reminderTimer);
	reminderTimer = setTimeout(() => {
		api('/api/v1/reminders', { method: 'PUT', body: v }).catch(() => {
			/* nilai lokal tetap tersimpan */
		});
	}, 600);
});

export const prefs: Writable<{ currency: string; timezone: string; theme: string }> = persisted(
	'cuh.prefs.v1',
	() => ({ currency: 'IDR', timezone: 'Asia/Jakarta', theme: 'system' })
);

// Convenience selectors used by pages
export const todayStr = todayKey(new Date());
export const monthStr = currentMonthKey(new Date());
