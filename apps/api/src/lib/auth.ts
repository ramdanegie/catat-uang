import jwt from '@elysiajs/jwt';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
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

// Hash memakai scrypt dari `node:crypto` (bukan `Bun.password`) agar kode yang
// sama jalan di Bun maupun Node/serverless. Format: scrypt$N$r$p$salt$hash.
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 } as const;

export async function hashPassword(plain: string) {
	const salt = randomBytes(16);
	const key = await scryptAsync(plain, salt, SCRYPT.keylen, SCRYPT);
	return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(plain: string, hash: string) {
	const parts = hash.split('$');
	if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
	const [, N, r, p, saltB64, keyB64] = parts;
	const expected = Buffer.from(keyB64, 'base64');
	const actual = await scryptAsync(plain, Buffer.from(saltB64, 'base64'), expected.length, {
		N: Number(N),
		r: Number(r),
		p: Number(p)
	}).catch(() => null);
	if (!actual || actual.length !== expected.length) return false;
	return timingSafeEqual(actual, expected);
}

function scryptAsync(
	plain: string,
	salt: Buffer,
	keylen: number,
	opts: { N: number; r: number; p: number }
): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		// maxmem default (32MB) terlalu kecil untuk N=16384, r=8.
		scrypt(plain, salt, keylen, { ...opts, maxmem: 128 * opts.N * opts.r * 2 }, (err, key) =>
			err ? reject(err) : resolve(key as Buffer)
		);
	});
}
