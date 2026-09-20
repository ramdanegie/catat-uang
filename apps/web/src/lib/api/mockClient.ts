// Typed mock API client — same contract as PRD §13-14 (`{success, data, meta}`).
// Frontend-only: reads from dummy stores. To connect backend later,
// replace each function body with `fetch('/api/v1/...')`.
import { get } from 'svelte/store';
import { activeExpenses, budgetItems, budgets, categories, expenses } from '$lib/dummy/store';
import { budgetUsage, byCategory, dailySeries, inDay, inMonth, monthlySeries, sum } from '$lib/utils/analytics';
import { monthKeyOf } from '$lib/utils/format';

function ok<T>(data: T, meta: Record<string, unknown> = {}) {
	return { success: true as const, data, meta };
}

export const mockApi = {
	getDashboard(todayIso: string, month: string) {
		const all = get(expenses);
		const todayRows = inDay(all, todayIso);
		const monthRows = inMonth(all, month);
		const monthTotal = sum(monthRows);
		const topToday = byCategory(todayRows)[0] ?? null;
		return ok({
			today_total: sum(todayRows),
			today_count: todayRows.length,
			today_top_category: topToday,
			month_total: monthTotal,
			month_count: monthRows.length,
			daily_series: dailySeries(all, month),
			recent: get(activeExpenses).slice(0, 8),
			top_categories: byCategory(monthRows).slice(0, 5)
		});
	},

	listExpenses(params: { from?: string; to?: string; category_id?: string; q?: string } = {}) {
		let rows = get(activeExpenses);
		if (params.from) rows = rows.filter((e) => e.transaction_date >= params.from!);
		if (params.to) rows = rows.filter((e) => e.transaction_date <= params.to!);
		if (params.category_id) rows = rows.filter((e) => e.category_id === params.category_id);
		if (params.q) {
			const q = params.q.toLowerCase();
			rows = rows.filter((e) => e.description.toLowerCase().includes(q));
		}
		return ok(rows, { count: rows.length });
	},

	getTrends(month: string) {
		const all = get(expenses);
		return ok({
			daily: dailySeries(all, month),
			monthly: monthlySeries(all, 6, month),
			categories: byCategory(inMonth(all, month))
		});
	},

	getBudgetUsage(month: string) {
		const all = get(expenses);
		const b = get(budgets).find((x) => x.month === month);
		return ok(budgetUsage(all, b, get(budgetItems)), { month, has_budget: !!b });
	},

	getReview(month: string) {
		const all = get(expenses);
		const rows = inMonth(all, month);
		const prevYm = monthKeyOf(month + '-01') === month ? prevOf(month) : month;
		const prevRows = inMonth(all, prevOf(month));
		const curr = sum(rows);
		const prev = sum(prevRows);
		const days = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
		return ok({
			month,
			current_total: curr,
			previous_total: prevRows.length ? prev : null,
			absolute_change: prevRows.length ? curr - prev : null,
			percentage_change: prevRows.length && prev ? ((curr - prev) / prev) * 100 : null,
			transaction_count: rows.length,
			average_daily: curr / days,
			top_category: byCategory(rows)[0] ?? null,
			by_category: byCategory(rows)
		});
	}
};

function prevOf(ym: string): string {
	const [y, m] = ym.split('-').map(Number);
	const d = new Date(y, m - 2, 1);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function categoryById(id: string) {
	return get(categories).find((c) => c.id === id);
}
