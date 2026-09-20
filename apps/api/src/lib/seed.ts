import { categories, reminderPreferences } from '../db/schema';
import { nowIso, uid } from './http';
import type { db } from '../db/client';

type Tx = { insert: typeof db.insert };

// Seed bawaan per user baru — sama dengan seed frontend (PRD §5.2B).
const DEFAULT_CATEGORIES = [
	{ id: 'makanan', name: 'Makanan & Minuman', icon: 'utensils-crossed', color: '#f59e0b' },
	{ id: 'transport', name: 'Transportasi', icon: 'motorbike', color: '#3b82f6' },
	{ id: 'belanja', name: 'Belanja', icon: 'shopping-bag', color: '#a855f7' },
	{ id: 'tagihan', name: 'Tagihan', icon: 'receipt-text', color: '#ef4444' },
	{ id: 'kesehatan', name: 'Kesehatan', icon: 'heart-pulse', color: '#10b981' },
	{ id: 'hiburan', name: 'Hiburan', icon: 'gamepad-2', color: '#ec4899' },
	{ id: 'pendidikan', name: 'Pendidikan', icon: 'graduation-cap', color: '#6366f1' },
	{ id: 'rumahtangga', name: 'Rumah Tangga', icon: 'house', color: '#14b8a6' },
	{ id: 'lainnya', name: 'Lainnya', icon: 'shapes', color: '#6b7280' }
];

export async function seedNewUser(tx: Tx, userId: string) {
	const now = nowIso();
	await tx.insert(categories).values(
		DEFAULT_CATEGORIES.map((c) => ({
			id: `${c.id}-${userId}`,
			userId,
			name: c.name,
			icon: c.icon,
			color: c.color,
			isDefault: 1,
			isActive: 1,
			createdAt: now,
			updatedAt: now
		}))
	);
	await tx.insert(reminderPreferences).values({
		id: uid('rem'),
		userId,
		dailyEnabled: 1,
		dailyTime: '20:00',
		weeklyEnabled: 1,
		weeklyDay: 'Minggu',
		weeklyTime: '19:00',
		updatedAt: now
	});
}
