import type { BudgetCategory, BudgetStatus, Category, Expense, Insight, MonthlyBudget } from '$lib/dummy/types';
import { monthKeyOf, prevMonthKey } from '$lib/utils/format';

export function active(list: Expense[]): Expense[] {
	return list.filter((e) => !e.deleted_at);
}

export function inMonth(list: Expense[], ym: string): Expense[] {
	return active(list).filter((e) => monthKeyOf(e.transaction_date) === ym);
}

export function inDay(list: Expense[], day: string): Expense[] {
	return active(list).filter((e) => e.transaction_date === day);
}

export function sum(list: Expense[]): number {
	return list.reduce((a, b) => a + b.amount, 0);
}

export function dailySeries(list: Expense[], ym: string): { date: string; total: number; count: number }[] {
	const [y, m] = ym.split('-').map(Number);
	const days = new Date(y, m, 0).getDate();
	const out = [];
	for (let d = 1; d <= days; d++) {
		const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
		const rows = inDay(list, key);
		out.push({ date: key, total: sum(rows), count: rows.length });
	}
	return out;
}

export function monthlySeries(list: Expense[], months = 6, endYm?: string): { month: string; total: number; count: number }[] {
	const end = endYm ?? list.map((e) => monthKeyOf(e.transaction_date)).sort().at(-1) ?? '2026-09';
	const out: { month: string; total: number; count: number }[] = [];
	let cur = end;
	for (let i = 0; i < months; i++) {
		const rows = inMonth(list, cur);
		out.unshift({ month: cur, total: sum(rows), count: rows.length });
		cur = prevMonthKey(cur);
	}
	return out;
}

export function byCategory(list: Expense[]): { category_id: string; total: number; count: number; pct: number }[] {
	const rows = active(list);
	const total = sum(rows);
	const map = new Map<string, { total: number; count: number }>();
	for (const e of rows) {
		const cur = map.get(e.category_id) ?? { total: 0, count: 0 };
		cur.total += e.amount;
		cur.count += 1;
		map.set(e.category_id, cur);
	}
	return [...map.entries()]
		.map(([category_id, v]) => ({ category_id, ...v, pct: total ? (v.total / total) * 100 : 0 }))
		.sort((a, b) => b.total - a.total);
}

export function budgetStatus(usagePct: number): BudgetStatus {
	if (usagePct >= 100) return 'exceeded';
	if (usagePct >= 90) return 'critical';
	if (usagePct >= 70) return 'warning';
	return 'normal';
}

export const STATUS_META: Record<BudgetStatus, { label: string; classes: string; bar: string }> = {
	normal: { label: 'Normal', classes: 'bg-ggreen-100 text-ggreen-700 dark:bg-ggreen-500/15 dark:text-ggreen-200', bar: 'bg-ggreen-500' },
	warning: { label: 'Warning', classes: 'bg-gyellow-100 text-gyellow-700 dark:bg-gyellow-500/15 dark:text-gyellow-200', bar: 'bg-gyellow-500' },
	critical: { label: 'Critical', classes: 'bg-gred-100 text-gred-600 dark:bg-gred-500/15 dark:text-gred-200', bar: 'bg-gred-500' },
	exceeded: { label: 'Exceeded', classes: 'bg-gred-600 text-white dark:bg-gred-500/20 dark:text-gred-200', bar: 'bg-gred-600' }
};

export function budgetUsage(
	expenses: Expense[],
	budget: MonthlyBudget | undefined,
	items: BudgetCategory[]
): { used: number; pct: number; remaining: number; status: BudgetStatus; perCategory: { category_id: string; limit: number; used: number; pct: number; status: BudgetStatus }[] } {
	if (!budget) return { used: 0, pct: 0, remaining: 0, status: 'normal', perCategory: [] };
	const rows = inMonth(expenses, budget.month);
	const used = sum(rows);
	const pct = budget.total_amount ? (used / budget.total_amount) * 100 : 0;
	const perCategory = items
		.filter((i) => i.budget_id === budget.id)
		.map((i) => {
			const cUsed = sum(rows.filter((e) => e.category_id === i.category_id));
			const cPct = i.amount ? (cUsed / i.amount) * 100 : 0;
			return { category_id: i.category_id, limit: i.amount, used: cUsed, pct: cPct, status: budgetStatus(cPct) };
		});
	return { used, pct, remaining: budget.total_amount - used, status: budgetStatus(pct), perCategory };
}

// ── Rule-based insights (PRD §5.6) — deterministic ──────────────────────────
export function generateInsights(
	expenses: Expense[],
	categories: Category[],
	ym: string,
	budget?: MonthlyBudget,
	items: BudgetCategory[] = []
): Insight[] {
	const rows = inMonth(expenses, ym);
	const total = sum(rows);
	const out: Insight[] = [];
	if (rows.length === 0) return out;

	const dist = byCategory(rows);
	const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;
	let pri = 1;

	// Rule 1: kategori > 30% total
	for (const d of dist) {
		if (d.pct > 30) {
			out.push({
				id: `ins-${ym}-top-${d.category_id}`,
				month: ym,
				type: 'top_category',
				title: `${catName(d.category_id)} porsi terbesar (${d.pct.toFixed(0)}%)`,
				description: `Pengeluaran ${catName(d.category_id)} menyumbang ${d.pct.toFixed(1)}% dari total bulan ini. Pertimbangkan menetapkan budget kategori yang lebih spesifik bulan depan.`,
				evidence: { kategori: catName(d.category_id), nominal: d.total, total, persen: Number(d.pct.toFixed(1)) },
				priority: pri++,
				read: false
			});
			break;
		}
	}

	// Rule 2: kategori naik > 20% vs rata-rata 3 bulan sebelumnya
	const prevs = [1, 2, 3].map((k) => {
		let cur = ym;
		for (let i = 0; i < k; i++) cur = prevMonthKey(cur);
		return cur;
	});
	for (const d of dist.slice(0, 4)) {
		const avgs = prevs.map((m) => sum(inMonth(expenses, m).filter((e) => e.category_id === d.category_id)));
		const avg = avgs.reduce((a, b) => a + b, 0) / 3;
		if (avg > 0 && d.total > avg * 1.2) {
			const rise = ((d.total - avg) / avg) * 100;
			out.push({
				id: `ins-${ym}-spike-${d.category_id}`,
				month: ym,
				type: 'category_spike',
				title: `${catName(d.category_id)} naik ${rise.toFixed(0)}% dari rata-rata`,
				description: `${catName(d.category_id)} naik ${rise.toFixed(1)}% dibanding rata-rata 3 bulan terakhir. Rata-rata: Rp${Math.round(avg).toLocaleString('id-ID')}, bulan ini: Rp${d.total.toLocaleString('id-ID')}.`,
				evidence: { kategori: catName(d.category_id), rata_rata: Math.round(avg), bulan_ini: d.total, kenaikan_pct: Number(rise.toFixed(1)) },
				priority: pri++,
				read: false
			});
		}
	}

	// Rule 3: transaksi kecil (< Rp50rb) berulang >= 8x pada satu kategori
	for (const d of dist) {
		const small = rows.filter((e) => e.category_id === d.category_id && e.amount < 50000).length;
		if (small >= 8) {
			out.push({
				id: `ins-${ym}-freq-${d.category_id}`,
				month: ym,
				type: 'frequent_small',
				title: `${small}x jajan kecil di ${catName(d.category_id)}`,
				description: `Ada ${small} transaksi di bawah Rp50.000 pada ${catName(d.category_id)}. Transaksi kecil yang sering bisa jadi kebocoran — coba rekap mingguan.`,
				evidence: { kategori: catName(d.category_id), frekuensi_kecil: small },
				priority: pri++,
				read: false
			});
			break;
		}
	}

	// Rule 4: budget status
	if (budget) {
		const u = budgetUsage(expenses, budget, items);
		if (u.status === 'exceeded') {
			out.push({
				id: `ins-${ym}-over`,
				month: ym,
				type: 'budget_exceeded',
				title: 'Budget bulan ini terlampaui',
				description: `Pemakaian ${u.pct.toFixed(0)}% dari budget. Selisih Rp${Math.abs(u.remaining).toLocaleString('id-ID')} di atas batas.`,
				evidence: { terpakai: u.used, budget: budget.total_amount, persen: Number(u.pct.toFixed(1)) },
				priority: pri++,
				read: false
			});
		} else if (u.status === 'warning' || u.status === 'critical') {
			out.push({
				id: `ins-${ym}-warn`,
				month: ym,
				type: 'budget_warning',
				title: `Budget sudah ${u.pct.toFixed(0)}% terpakai`,
				description: `Sisa Rp${u.remaining.toLocaleString('id-ID')} untuk sisa bulan ini. Perlambat pengeluaran non-prioritas.`,
				evidence: { terpakai: u.used, budget: budget.total_amount, persen: Number(u.pct.toFixed(1)) },
				priority: pri++,
				read: false
			});
		}
	}

	return out.sort((a, b) => a.priority - b.priority);
}

export function weeklySummary(expenses: Expense[], todayIso: string) {
	const t = new Date(todayIso + 'T00:00:00');
	const start = new Date(t);
	start.setDate(t.getDate() - 6);
	const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	const s = iso(start);
	const e = iso(t);
	const rows = active(expenses).filter((x) => x.transaction_date >= s && x.transaction_date <= e);
	const ps = new Date(start);
	ps.setDate(ps.getDate() - 7);
	const pe = new Date(start);
	pe.setDate(pe.getDate() - 1);
	const prev = active(expenses).filter((x) => x.transaction_date >= iso(ps) && x.transaction_date <= iso(pe));
	const dist = byCategory(rows);
	return {
		start: s,
		end: e,
		total: sum(rows),
		count: rows.length,
		top: dist[0],
		prevTotal: sum(prev),
		delta: sum(rows) - sum(prev)
	};
}
