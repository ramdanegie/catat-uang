// Logical schema — PRD §15. Amounts are integer IDR. Dates are YYYY-MM-DD text.
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	name: text('name').notNull(),
	timezone: text('timezone').notNull().default('Asia/Jakarta'),
	currency: text('currency').notNull().default('IDR'),
	googleId: text('google_id').unique(),
	avatarUrl: text('avatar_url'),
	createdAt: text('created_at').notNull(),
	updatedAt: text('updated_at').notNull()
});

export const categories = sqliteTable(
	'categories',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id),
		name: text('name').notNull(),
		icon: text('icon').notNull().default('shapes'),
		color: text('color').notNull().default('#6b7280'),
		isDefault: integer('is_default').notNull().default(1),
		isActive: integer('is_active').notNull().default(1),
		createdAt: text('created_at').notNull(),
		updatedAt: text('updated_at').notNull()
	},
	(t) => [index('categories_user_idx').on(t.userId)]
);

export const expenses = sqliteTable(
	'expenses',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id),
		categoryId: text('category_id')
			.notNull()
			.references(() => categories.id),
		amount: integer('amount').notNull(),
		description: text('description').notNull(),
		note: text('note'),
		transactionDate: text('transaction_date').notNull(),
		paymentMethod: text('payment_method'),
		createdAt: text('created_at').notNull(),
		updatedAt: text('updated_at').notNull(),
		deletedAt: text('deleted_at')
	},
	(t) => [
		index('expenses_user_date_idx').on(t.userId, t.transactionDate),
		index('expenses_user_cat_date_idx').on(t.userId, t.categoryId, t.transactionDate)
	]
);

export const monthlyBudgets = sqliteTable(
	'monthly_budgets',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id),
		month: text('month').notNull(),
		totalAmount: integer('total_amount').notNull(),
		createdAt: text('created_at').notNull(),
		updatedAt: text('updated_at').notNull()
	},
	(t) => [
		uniqueIndex('budgets_user_month_uk').on(t.userId, t.month),
		index('budgets_user_month_idx').on(t.userId, t.month)
	]
);

export const budgetCategories = sqliteTable('budget_categories', {
	id: text('id').primaryKey(),
	budgetId: text('budget_id')
		.notNull()
		.references(() => monthlyBudgets.id),
	categoryId: text('category_id')
		.notNull()
		.references(() => categories.id),
	amount: integer('amount').notNull(),
	createdAt: text('created_at').notNull(),
	updatedAt: text('updated_at').notNull()
});

export const reviewNotes = sqliteTable(
	'review_notes',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id),
		month: text('month').notNull(),
		note: text('note').notNull().default(''),
		createdAt: text('created_at').notNull(),
		updatedAt: text('updated_at').notNull()
	},
	(t) => [uniqueIndex('review_user_month_uk').on(t.userId, t.month)]
);

export const reminderPreferences = sqliteTable('reminder_preferences', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.unique()
		.references(() => users.id),
	dailyEnabled: integer('daily_enabled').notNull().default(1),
	dailyTime: text('daily_time').notNull().default('20:00'),
	weeklyEnabled: integer('weekly_enabled').notNull().default(1),
	weeklyDay: text('weekly_day').notNull().default('Minggu'),
	weeklyTime: text('weekly_time').notNull().default('19:00'),
	updatedAt: text('updated_at').notNull()
});

export type User = typeof users.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
