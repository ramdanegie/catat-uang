// Read-model aggregation dari transaksi aktif (soft-deleted dikecualikan).
import { budgetStatus } from './http';

export type ExpRow = {
	id: string;
	categoryId: string;
	amount: number;
	description: string;
	transactionDate: string;
	createdAt: string;
};

export type CatRow = { id: string; name: string; icon: string; color: string };

const active = (rows: ExpRow[]) => rows; // query sudah filter deleted_at IS NULL
export const inMonth = (rows: ExpRow[], ym: string) => active(rows).filter((e) => e.transactionDate.slice(0, 7) === ym);
export const inDay = (rows: ExpRow[], day: string) => active(rows).filter((e) => e.transactionDate === day);
export const sum = (rows: ExpRow[]) => rows.reduce((a, b) => a + b.amount, 0);

export function dailySeries(rows: ExpRow[], ym: string) {
	const [y, m] = ym.split('-').map(Number);
	const days = new Date(y, m, 0).getDate();
	const out = [];
	for (let d = 1; d <= days; d++) {
		const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
		const dayRows = inDay(rows, key);
		out.push({ date: key, total: sum(dayRows), count: dayRows.length });
	}
	return out;
}

export function monthlySeries(rows: ExpRow[], months: number, endYm: string, prevOf: (ym: string) => string) {
	const out: { month: string; total: number; count: number }[] = [];
	let cur = endYm;
	for (let i = 0; i < months; i++) {
		const mRows = inMonth(rows, cur);
		out.unshift({ month: cur, total: sum(mRows), count: mRows.length });
		cur = prevOf(cur);
	}
	return out;
}

export function byCategory(rows: ExpRow[]) {
	const total = sum(rows);
	const map = new Map<string, { total: number; count: number }>();
	for (const e of rows) {
		const cur = map.get(e.categoryId) ?? { total: 0, count: 0 };
		cur.total += e.amount;
		cur.count += 1;
		map.set(e.categoryId, cur);
	}
	return [...map.entries()]
		.map(([category_id, v]) => ({ category_id, ...v, pct: total ? (v.total / total) * 100 : 0 }))
		.sort((a, b) => b.total - a.total);
}

export function usageOf(
	rows: ExpRow[],
	budget: { id: string; totalAmount: number; month: string } | undefined,
	items: { budgetId: string; categoryId: string; amount: number }[]
) {
	if (!budget) return { used: 0, pct: 0, remaining: 0, status: budgetStatus(0), perCategory: [] as unknown[] };
	const mRows = inMonth(rows, budget.month);
	const used = sum(mRows);
	const pct = budget.totalAmount ? (used / budget.totalAmount) * 100 : 0;
	const perCategory = items
		.filter((i) => i.budgetId === budget.id)
		.map((i) => {
			const cUsed = sum(mRows.filter((e) => e.categoryId === i.categoryId));
			const cPct = i.amount ? (cUsed / i.amount) * 100 : 0;
			return { category_id: i.categoryId, limit: i.amount, used: cUsed, pct: cPct, status: budgetStatus(cPct) };
		});
	return { used, pct, remaining: budget.totalAmount - used, status: budgetStatus(pct), perCategory };
}

export function catMeta(cats: CatRow[], id: string) {
	const c = cats.find((x) => x.id === id);
	return c ? { id: c.id, name: c.name, icon: c.icon, color: c.color } : { id, name: id, icon: 'shapes', color: '#6b7280' };
}
