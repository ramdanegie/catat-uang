// API response envelope — PRD §14.
export function ok<T>(data: T, meta: Record<string, unknown> = {}) {
	return { success: true as const, data, meta };
}

export function fail(code: string, message: string, fields?: Record<string, string>, status = 400) {
	return { status, body: { success: false as const, error: { code, message, ...(fields ? { fields } : {}) } } };
}

export function nowIso() {
	return new Date().toISOString();
}

export function uid(prefix: string) {
	return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export function isValidMonth(s: string) {
	return /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

export function isValidDate(s: string) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
	const [y, m, d] = s.split('-').map(Number);
	if (m < 1 || m > 12 || d < 1 || d > 31) return false;
	// Konstruksi via UTC agar independen timezone server.
	const dt = new Date(Date.UTC(y, m - 1, d));
	return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function prevMonth(ym: string) {
	const [y, m] = ym.split('-').map(Number);
	const d = new Date(y, m - 2, 1);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function budgetStatus(pct: number): 'normal' | 'warning' | 'critical' | 'exceeded' {
	if (pct >= 100) return 'exceeded';
	if (pct >= 90) return 'critical';
	if (pct >= 70) return 'warning';
	return 'normal';
}

export function toCategory(row: {
	id: string;
	name: string;
	icon: string;
	color: string;
	isDefault: number;
	isActive: number;
}) {
	return {
		id: row.id,
		name: row.name,
		icon: row.icon,
		color: row.color,
		is_default: row.isDefault === 1,
		is_active: row.isActive === 1
	};
}

export function toExpense(row: {
	id: string;
	userId: string;
	categoryId: string;
	amount: number;
	description: string;
	note: string | null;
	transactionDate: string;
	paymentMethod: string | null;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
}) {
	return {
		id: row.id,
		user_id: row.userId,
		category_id: row.categoryId,
		amount: row.amount,
		description: row.description,
		note: row.note ?? undefined,
		transaction_date: row.transactionDate,
		payment_method: row.paymentMethod ?? undefined,
		created_at: row.createdAt,
		updated_at: row.updatedAt,
		deleted_at: row.deletedAt
	};
}
