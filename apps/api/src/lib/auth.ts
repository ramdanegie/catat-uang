import jwt from '@elysiajs/jwt';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '30d';

export const jwtPlugin = jwt({ name: 'jwt', secret: JWT_SECRET, exp: JWT_EXPIRES_IN });

export type AuthUser = {
	id: string;
	name: string;
	email: string;
	currency: string;
	timezone: string;
	avatar_url?: string | null;
};

export class UnauthorizedError extends Error {
	constructor() {
		super('UNAUTHORIZED');
	}
}

type JwtLike = { verify: (token: string) => Promise<unknown> };
type LooseContext = {
	jwt: JwtLike;
	cookie: Record<string, { value?: unknown } | undefined>;
	headers: Record<string, string | undefined>;
};

export function extractToken(cookie: LooseContext['cookie'], headers: LooseContext['headers']): string | null {
	const header = headers.authorization ?? headers.Authorization;
	const bearer = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : null;
	const raw = cookie.cu_token?.value;
	const fromCookie = typeof raw === 'string' ? raw : null;
	return bearer ?? fromCookie;
}

export async function getUserFromToken(deps: LooseContext): Promise<AuthUser | null> {
	const token = extractToken(deps.cookie, deps.headers);
	if (!token) return null;
	const payload = (await deps.jwt.verify(token).catch(() => null)) as Record<string, unknown> | null;
	const sub = payload && typeof payload.sub === 'string' ? payload.sub : null;
	if (!sub) return null;
	const rows = await db.select().from(users).where(eq(users.id, sub)).limit(1);
	const u = rows[0];
	if (!u) return null;
	return { id: u.id, name: u.name, email: u.email, currency: u.currency, timezone: u.timezone, avatar_url: u.avatarUrl };
}

// Dipakai inline per router: `.use(jwtPlugin).derive(authDerive())`.
// Derive inline (bukan plugin terpisah) agar tipe `user` terbaca TypeScript.
export function authDerive() {
	return async (ctx: LooseContext) => {
		const user = await getUserFromToken(ctx);
		if (!user) throw new UnauthorizedError();
		return { user };
	};
}

export async function hashPassword(plain: string) {
	return Bun.password.hash(plain);
}

export async function verifyPassword(plain: string, hash: string) {
	return Bun.password.verify(plain, hash);
}
