import { Elysia } from 'elysia';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { categories } from '../db/schema';
import { authDerive, jwtPlugin } from '../lib/auth';
import { ok, toCategory } from '../lib/http';

export const categoryRoutes = new Elysia({ prefix: '/api/v1/categories' }).use(jwtPlugin).derive(authDerive()).get('/', async ({ user }) => {
	const rows = await db
		.select()
		.from(categories)
		.where(and(eq(categories.userId, user.id), eq(categories.isActive, 1)));
	return ok(rows.map(toCategory));
});
