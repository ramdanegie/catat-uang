import type { BudgetCategory, Category, Expense, MonthlyBudget, ReminderPrefs } from './types';

// ── Category seed (PRD §5.2B) ───────────────────────────────────────────────
export const DEFAULT_CATEGORIES: Category[] = [
	{ id: 'makanan', name: 'Makanan & Minuman', icon: 'utensils-crossed', color: '#f59e0b', is_default: true, is_active: true },
	{ id: 'transport', name: 'Transportasi', icon: 'motorbike', color: '#3b82f6', is_default: true, is_active: true },
	{ id: 'belanja', name: 'Belanja', icon: 'shopping-bag', color: '#a855f7', is_default: true, is_active: true },
	{ id: 'tagihan', name: 'Tagihan', icon: 'receipt-text', color: '#ef4444', is_default: true, is_active: true },
	{ id: 'kesehatan', name: 'Kesehatan', icon: 'heart-pulse', color: '#10b981', is_default: true, is_active: true },
	{ id: 'hiburan', name: 'Hiburan', icon: 'gamepad-2', color: '#ec4899', is_default: true, is_active: true },
	{ id: 'pendidikan', name: 'Pendidikan', icon: 'graduation-cap', color: '#6366f1', is_default: true, is_active: true },
	{ id: 'rumahtangga', name: 'Rumah Tangga', icon: 'house', color: '#14b8a6', is_default: true, is_active: true },
	{ id: 'lainnya', name: 'Lainnya', icon: 'shapes', color: '#6b7280', is_default: true, is_active: true }
];

export const PAYMENT_METHODS = ['Tunai', 'QRIS', 'Transfer', 'E-Wallet', 'Kartu Debit'];

// ── Deterministic PRNG (mulberry32) so dummy data is stable across reloads ──
function rng(seed: number) {
	let a = seed;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const SAMPLE_DESC: Record<string, string[]> = {
	makanan: ['Nasi Padang Sederhana', 'Kopi Kenangan', 'Ayam Geprek', 'Soto Ayam', 'Mie Gacoan', 'Jajan Pasar', 'Bakso Malang', 'Nasi Goreng Tek-Tek'],
	transport: ['Bensin Pertalite', 'Parkir Mall', 'Ojek Online', 'Tol Jagorawi', 'Busway', 'Cuci Motor'],
	belanja: ['Indomaret', 'Shopee - Kaos', 'Minyak Goreng 2L', 'Skincare', 'Sepatu Running'],
	tagihan: ['Listrik PLN', 'Internet Biznet', 'Air PDAM', 'Pulsa Telkomsel', 'Netflix'],
	kesehatan: ['Apotek - Vitamin', 'Puskesmas', 'Masker & Tissue'],
	hiburan: ['Nonton Bioskop', 'Top Up Game', 'Karaoke', 'Kopi Nongkrong'],
	pendidikan: ['Buku Gramedia', 'Kursus Online', 'Fotokopi & Print'],
	rumahtangga: ['Gas LPG 3kg', 'Detergen & Sabun', 'Galon Aqua', 'Service AC'],
	lainnya: ['Parkir Liar', 'Sumbangan', 'Laundry Kiloan']
};

const AMOUNT_RANGE: Record<string, [number, number]> = {
	makanan: [12000, 65000],
	transport: [10000, 120000],
	belanja: [25000, 450000],
	tagihan: [50000, 650000],
	kesehatan: [15000, 250000],
	hiburan: [30000, 250000],
	pendidikan: [20000, 350000],
	rumahtangga: [25000, 400000],
	lainnya: [5000, 150000]
};

function pad(n: number) {
	return n < 10 ? `0${n}` : `${n}`;
}

export function currentMonthKey(d = new Date()): string {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function todayKey(d = new Date()): string {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Generate ~6 months of expenses ending at the given "today"
export function seedExpenses(userId: string, today = new Date()): Expense[] {
	const rand = rng(42);
	const out: Expense[] = [];
	let seq = 1;
	const catIds = DEFAULT_CATEGORIES.map((c) => c.id);

	// monthsBack 5..0 (6 months incl. current)
	for (let back = 5; back >= 0; back--) {
		const ref = new Date(today.getFullYear(), today.getMonth() - back, 1);
		const year = ref.getFullYear();
		const month = ref.getMonth();
		const daysInMonth = new Date(year, month + 1, 0).getDate();
		const isCurrent = back === 0;
		const lastDay = isCurrent ? today.getDate() : daysInMonth;
		// volume grows slightly toward current month to make charts interesting
		const dailyBase = back >= 3 ? 1.4 : back >= 1 ? 2.1 : 2.6;

		for (let day = 1; day <= lastDay; day++) {
			const nTx = Math.max(0, Math.round(dailyBase + (rand() * 2.4 - 0.7)));
			for (let i = 0; i < nTx; i++) {
				const cat = catIds[Math.floor(rand() * catIds.length)];
				const [lo, hi] = AMOUNT_RANGE[cat];
				// round to nearest 500 for realism
				const raw = lo + rand() * (hi - lo);
				const amount = Math.max(5000, Math.round(raw / 500) * 500);
				const descs = SAMPLE_DESC[cat];
				const description = descs[Math.floor(rand() * descs.length)];
				const date = `${year}-${pad(month + 1)}-${pad(day)}`;
				const hh = pad(6 + Math.floor(rand() * 15));
				const mm = pad(Math.floor(rand() * 60));
				out.push({
					id: `exp-${seq++}`,
					user_id: userId,
					category_id: cat,
					amount,
					description,
					note: rand() > 0.82 ? 'Catatan tambahan contoh' : undefined,
					transaction_date: date,
					payment_method: PAYMENT_METHODS[Math.floor(rand() * PAYMENT_METHODS.length)],
					created_at: `${date}T${hh}:${mm}:00`,
					updated_at: `${date}T${hh}:${mm}:00`,
					deleted_at: null
				});
			}
		}
	}

	// Guarantee today's transactions exist for empty-state-free demo
	const tk = todayKey(today);
	for (let k = 0; k < 3; k++) {
		const cat = ['makanan', 'transport', 'hiburan'][k];
		const [lo, hi] = AMOUNT_RANGE[cat];
		out.push({
			id: `exp-${seq++}`,
			user_id: userId,
			category_id: cat,
			amount: Math.round((lo + (hi - lo) * rng(k + 7)()) / 500) * 500,
			description: SAMPLE_DESC[cat][k % SAMPLE_DESC[cat].length],
			transaction_date: tk,
			payment_method: PAYMENT_METHODS[k % PAYMENT_METHODS.length],
			created_at: `${tk}T0${8 + k}:15:00`,
			updated_at: `${tk}T0${8 + k}:15:00`,
			deleted_at: null
		});
	}

	// One soft-deleted example (must be excluded from aggregates)
	out.push({
		id: `exp-${seq++}`,
		user_id: userId,
		category_id: 'hiburan',
		amount: 199000,
		description: 'Contoh terhapus (soft delete)',
		transaction_date: tk,
		payment_method: 'QRIS',
		created_at: `${tk}T07:00:00`,
		updated_at: `${tk}T07:00:00`,
		deleted_at: `${tk}T08:00:00`
	});

	return out.sort((a, b) => (a.transaction_date < b.transaction_date ? 1 : -1));
}

export function seedBudgets(userId: string, today = new Date()): { budgets: MonthlyBudget[]; items: BudgetCategory[] } {
	const mk = (back: number) => {
		const d = new Date(today.getFullYear(), today.getMonth() - back, 1);
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
	};
	const budgets: MonthlyBudget[] = [
		{ id: 'bud-cur', user_id: userId, month: mk(0), total_amount: 5000000 },
		{ id: 'bud-prev', user_id: userId, month: mk(1), total_amount: 5000000 }
	];
	const items: BudgetCategory[] = [
		{ id: 'bc1', budget_id: 'bud-cur', category_id: 'makanan', amount: 1500000 },
		{ id: 'bc2', budget_id: 'bud-cur', category_id: 'transport', amount: 750000 },
		{ id: 'bc3', budget_id: 'bud-cur', category_id: 'hiburan', amount: 300000 },
		{ id: 'bc4', budget_id: 'bud-cur', category_id: 'belanja', amount: 1000000 },
		{ id: 'bc5', budget_id: 'bud-cur', category_id: 'lainnya', amount: 1450000 },
		{ id: 'bc6', budget_id: 'bud-prev', category_id: 'makanan', amount: 1500000 },
		{ id: 'bc7', budget_id: 'bud-prev', category_id: 'transport', amount: 750000 }
	];
	return { budgets, items };
}

export const DEFAULT_REMINDERS: ReminderPrefs = {
	daily_enabled: true,
	daily_time: '20:00',
	weekly_enabled: true,
	weekly_day: 'Minggu',
	weekly_time: '19:00'
};
