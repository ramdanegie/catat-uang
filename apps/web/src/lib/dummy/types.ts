// Dummy domain types — mirror PRD §FR-03..FR-08 + §15 schema
// Frontend-only phase: no fetch, all data from localStorage-backed stores.
// Later swap `mockClient` internals to real fetch without changing pages.

export interface Category {
	id: string;
	name: string;
	/** Lucide icon name (kebab-case), rendered via AppIcon. No emoji. */
	icon: string;
	color: string;
	is_default: boolean;
	is_active: boolean;
}

export interface Expense {
	id: string;
	user_id: string;
	category_id: string;
	amount: number; // integer IDR
	description: string;
	note?: string;
	transaction_date: string; // YYYY-MM-DD
	payment_method?: string;
	created_at: string;
	updated_at: string;
	deleted_at?: string | null;
}

export interface MonthlyBudget {
	id: string;
	user_id: string;
	month: string; // YYYY-MM
	total_amount: number;
}

export interface BudgetCategory {
	id: string;
	budget_id: string;
	category_id: string;
	amount: number;
}

export interface ReviewNote {
	id: string;
	user_id: string;
	month: string;
	note: string;
	updated_at: string;
}

export type InsightType =
	| 'top_category'
	| 'category_spike'
	| 'frequent_small'
	| 'budget_warning'
	| 'budget_exceeded';

export interface Insight {
	id: string;
	month: string;
	type: InsightType;
	title: string;
	description: string;
	evidence: Record<string, string | number>;
	priority: number; // 1 = highest
	read: boolean;
}

export interface ReminderPrefs {
	daily_enabled: boolean;
	daily_time: string; // HH:mm
	weekly_enabled: boolean;
	weekly_day: string;
	weekly_time: string;
}

export interface DummyUser {
	id: string;
	name: string;
	email: string;
	currency: string;
	timezone: string;
	/** URL avatar (diisi dari Google bila login via Google). */
	avatar_url?: string | null;
	theme: 'light' | 'dark' | 'system';
}

export type BudgetStatus = 'normal' | 'warning' | 'critical' | 'exceeded';

export interface PaymentMethod {
	id: string;
	label: string;
}
