// Rule-based insights — deterministik, mirror logika frontend (PRD §5.6).
// Setiap insight menyertakan evidence angka yang bisa ditelusuri.
import { budgetStatus, prevMonth } from './http';

type Exp = { categoryId: string; amount: number; transactionDate: string };
type Cat = { id: string; name: string };

export type Insight = {
	id: string;
	month: string;
	type: 'top_category' | 'category_spike' | 'frequent_small' | 'budget_warning' | 'budget_exceeded';
	title: string;
	description: string;
	evidence: Record<string, string | number>;
	priority: number;
	read: boolean;
};

const inMonth = (rows: Exp[], ym: string) => rows.filter((e) => e.transactionDate.slice(0, 7) === ym);
const sum = (rows: Exp[]) => rows.reduce((a, b) => a + b.amount, 0);

function dist(rows: Exp[]) {
	const total = sum(rows);
	const map = new Map<string, { total: number; count: number }>();
	for (const e of rows) {
		const cur = map.get(e.categoryId) ?? { total: 0, count: 0 };
		cur.total += e.amount;
		cur.count += 1;
		map.set(e.categoryId, cur);
	}
	return [...map.entries()]
		.map(([categoryId, v]) => ({ categoryId, ...v, pct: total ? (v.total / total) * 100 : 0 }))
		.sort((a, b) => b.total - a.total);
}

export function generateInsights(
	all: Exp[],
	cats: Cat[],
	ym: string,
	budget?: { totalAmount: number } | null
): Insight[] {
	const rows = inMonth(all, ym);
	const total = sum(rows);
	const out: Insight[] = [];
	if (rows.length === 0) return out;
	const name = (id: string) => cats.find((c) => c.id === id)?.name ?? id;
	const d = dist(rows);
	let pri = 1;

	const top = d.find((x) => x.pct > 30);
	if (top) {
		out.push({
			id: `ins-${ym}-top-${top.categoryId}`,
			month: ym,
			type: 'top_category',
			title: `${name(top.categoryId)} porsi terbesar (${top.pct.toFixed(0)}%)`,
			description: `Pengeluaran ${name(top.categoryId)} menyumbang ${top.pct.toFixed(1)}% dari total bulan ini. Pertimbangkan menetapkan budget kategori yang lebih spesifik bulan depan.`,
			evidence: { kategori: name(top.categoryId), nominal: top.total, total, persen: Number(top.pct.toFixed(1)) },
			priority: pri++,
			read: false
		});
	}

	const prevs = [1, 2, 3].map((k) => {
		let cur = ym;
		for (let i = 0; i < k; i++) cur = prevMonth(cur);
		return cur;
	});
	for (const item of d.slice(0, 4)) {
		const avg = prevs.map((m) => sum(inMonth(all, m).filter((e) => e.categoryId === item.categoryId))).reduce((a, b) => a + b, 0) / 3;
		if (avg > 0 && item.total > avg * 1.2) {
			const rise = ((item.total - avg) / avg) * 100;
			out.push({
				id: `ins-${ym}-spike-${item.categoryId}`,
				month: ym,
				type: 'category_spike',
				title: `${name(item.categoryId)} naik ${rise.toFixed(0)}% dari rata-rata`,
				description: `${name(item.categoryId)} naik ${rise.toFixed(1)}% dibanding rata-rata 3 bulan terakhir. Rata-rata: Rp${Math.round(avg).toLocaleString('id-ID')}, bulan ini: Rp${item.total.toLocaleString('id-ID')}.`,
				evidence: { kategori: name(item.categoryId), rata_rata: Math.round(avg), bulan_ini: item.total, kenaikan_pct: Number(rise.toFixed(1)) },
				priority: pri++,
				read: false
			});
		}
	}

	const freq = d.find((x) => rows.filter((e) => e.categoryId === x.categoryId && e.amount < 50000).length >= 8);
	if (freq) {
		const small = rows.filter((e) => e.categoryId === freq.categoryId && e.amount < 50000).length;
		out.push({
			id: `ins-${ym}-freq-${freq.categoryId}`,
			month: ym,
			type: 'frequent_small',
			title: `${small}x jajan kecil di ${name(freq.categoryId)}`,
			description: `Ada ${small} transaksi di bawah Rp50.000 pada ${name(freq.categoryId)}. Transaksi kecil yang sering bisa jadi kebocoran — coba rekap mingguan.`,
			evidence: { kategori: name(freq.categoryId), frekuensi_kecil: small },
			priority: pri++,
			read: false
		});
	}

	if (budget) {
		const used = total;
		const pct = budget.totalAmount ? (used / budget.totalAmount) * 100 : 0;
		const st = budgetStatus(pct);
		if (st === 'exceeded') {
			out.push({
				id: `ins-${ym}-over`,
				month: ym,
				type: 'budget_exceeded',
				title: 'Budget bulan ini terlampaui',
				description: `Pemakaian ${pct.toFixed(0)}% dari budget. Selisih Rp${Math.abs(budget.totalAmount - used).toLocaleString('id-ID')} di atas batas.`,
				evidence: { terpakai: used, budget: budget.totalAmount, persen: Number(pct.toFixed(1)) },
				priority: pri++,
				read: false
			});
		} else if (st === 'warning' || st === 'critical') {
			out.push({
				id: `ins-${ym}-warn`,
				month: ym,
				type: 'budget_warning',
				title: `Budget sudah ${pct.toFixed(0)}% terpakai`,
				description: `Sisa Rp${(budget.totalAmount - used).toLocaleString('id-ID')} untuk sisa bulan ini. Perlambat pengeluaran non-prioritas.`,
				evidence: { terpakai: used, budget: budget.totalAmount, persen: Number(pct.toFixed(1)) },
				priority: pri++,
				read: false
			});
		}
	}

	return out.sort((a, b) => a.priority - b.priority);
}
