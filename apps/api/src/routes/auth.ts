import { Elysia, t } from 'elysia';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema';
import { authDerive, hashPassword, jwtPlugin, verifyPassword } from '../lib/auth';
import { buildAuthUrl, exchangeCode, fetchGoogleProfile, frontendBase, googleConfigured, randomState } from '../lib/google';
import { fail, nowIso, ok, uid } from '../lib/http';
import { seedNewUser } from '../lib/seed';

const publicUser = (u: typeof users.$inferSelect) => ({
	id: u.id,
	name: u.name,
	email: u.email,
	currency: u.currency,
	timezone: u.timezone,
	avatar_url: u.avatarUrl ?? null
});

export const authRoutes = new Elysia({ prefix: '/api/v1/auth' })
	.use(jwtPlugin)
	.post(
		'/register',
		async ({ body, jwt, cookie, status }) => {
			const email = body.email.trim().toLowerCase();
			const exists = await db.select().from(users).where(eq(users.email, email)).limit(1);
			if (exists[0]) return status(409, fail('EMAIL_TAKEN', 'Email sudah terdaftar', undefined, 409).body);
			const now = nowIso();
			const id = uid('user');
			const passwordHash = await hashPassword(body.password);
			// Atomic: user + seed kategori + reminder prefs (PRD §18.2).
			await db.transaction(async (tx) => {
				await tx.insert(users).values({
					id,
					email,
					passwordHash,
					name: body.name.trim(),
					timezone: 'Asia/Jakarta',
					currency: 'IDR',
					createdAt: now,
					updatedAt: now
				});
				await seedNewUser(tx, id);
			});
			const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
			const token = await jwt.sign({ sub: id });
			cookie.cu_token?.set({ value: token, httpOnly: true, path: '/', maxAge: 30 * 24 * 3600 });
			return ok({ user: publicUser(rows[0]!), token });
		},
		{
			body: t.Object({
				name: t.String({ minLength: 2, maxLength: 100 }),
				email: t.String({ format: 'email', maxLength: 255 }),
				password: t.String({ minLength: 4, maxLength: 200 })
			})
		}
	)
	.post(
		'/login',
		async ({ body, jwt, cookie, status }) => {
			const email = body.email.trim().toLowerCase();
			const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
			const u = rows[0];
			if (!u || !(await verifyPassword(body.password, u.passwordHash))) {
				return status(401, fail('INVALID_CREDENTIALS', 'Email atau password salah', undefined, 401).body);
			}
			const token = await jwt.sign({ sub: u.id });
			cookie.cu_token?.set({ value: token, httpOnly: true, path: '/', maxAge: 30 * 24 * 3600 });
			return ok({ user: publicUser(u), token });
		},
		{ body: t.Object({ email: t.String({ format: 'email' }), password: t.String({ minLength: 1 }) }) }
	)
	.post('/logout', ({ cookie }) => {
		cookie.cu_token?.remove();
		return ok({ logged_out: true });
	})
	.get('/google/status', () => ok({ enabled: googleConfigured() }))
	.get('/google/start', ({ cookie, request }) => {
		// Tanpa pengecekan di frontend: bila belum dikonfigurasi, kembalikan
		// user ke halaman login dengan pesan error (bukan JSON mentah).
		if (!googleConfigured()) {
			return Response.redirect(
				`${frontendBase()}/login#${new URLSearchParams({ error: 'Login Google belum dikonfigurasi di server' }).toString()}`,
				302
			);
		}
		const state = randomState();
		// sameSite lax: callback Google adalah navigasi GET tingkat atas, jadi
		// cookie tetap terkirim. secure hanya bila origin sudah HTTPS, supaya dev
		// lokal di http://localhost tidak kehilangan cookie state.
		cookie.cu_oauth_state?.set({
			value: state,
			httpOnly: true,
			sameSite: 'lax',
			secure: new URL(request.url).protocol === 'https:',
			path: '/',
			maxAge: 600
		});
		return Response.redirect(buildAuthUrl(state), 302);
	})
	.get(
		'/google/callback',
		async ({ query, cookie, jwt, status }) => {
			const done = (fragment: string) => Response.redirect(`${frontendBase()}/login/callback#${fragment}`, 302);
			if (!googleConfigured()) return done('error=' + encodeURIComponent('Login Google belum dikonfigurasi'));
			const expected = cookie.cu_oauth_state?.value;
			cookie.cu_oauth_state?.remove();
			if (!query.code || !query.state || query.state !== expected) {
				return done('error=' + encodeURIComponent('Sesi Google tidak valid, coba lagi'));
			}
			try {
				const accessToken = await exchangeCode(query.code);
				const profile = await fetchGoogleProfile(accessToken);
				const now = nowIso();
				// Find-or-create by google_id, lalu tautkan via email bila sudah ada.
				let userId: string;
				const byGoogle = await db.select().from(users).where(eq(users.googleId, profile.sub)).limit(1);
				if (byGoogle[0]) {
					userId = byGoogle[0].id;
					await db
						.update(users)
						.set({ avatarUrl: byGoogle[0].avatarUrl ?? profile.picture ?? null, updatedAt: now })
						.where(eq(users.id, userId));
				} else {
					const byEmail = await db.select().from(users).where(eq(users.email, profile.email)).limit(1);
					if (byEmail[0]) {
						userId = byEmail[0].id;
						await db
							.update(users)
							.set({ googleId: profile.sub, avatarUrl: byEmail[0].avatarUrl ?? profile.picture ?? null, updatedAt: now })
							.where(eq(users.id, userId));
					} else {
						userId = uid('user');
						const passwordHash = await hashPassword(`google-${userId}-${Date.now()}`);
						await db.transaction(async (tx) => {
							await tx.insert(users).values({
								id: userId,
								email: profile.email,
								passwordHash,
								name: profile.name,
								timezone: 'Asia/Jakarta',
								currency: 'IDR',
								googleId: profile.sub,
								avatarUrl: profile.picture ?? null,
								createdAt: now,
								updatedAt: now
							});
							await seedNewUser(tx, userId);
						});
					}
				}
				const token = await jwt.sign({ sub: userId });
				cookie.cu_token?.set({ value: token, httpOnly: true, path: '/', maxAge: 30 * 24 * 3600 });
				return done('token=' + encodeURIComponent(token));
			} catch (e) {
				return done('error=' + encodeURIComponent(e instanceof Error ? e.message : 'Login Google gagal'));
			}
		},
		{ query: t.Object({ code: t.Optional(t.String()), state: t.Optional(t.String()), error: t.Optional(t.String()) }) }
	)
	.derive(authDerive())
	.get('/me', ({ user }) => ok({ user }))
	.patch(
		'/me',
		async ({ user, body }) => {
			await db.update(users).set({ name: body.name.trim(), updatedAt: nowIso() }).where(eq(users.id, user.id));
			const rows = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
			return ok({ user: publicUser(rows[0]!) });
		},
		{ body: t.Object({ name: t.String({ minLength: 2, maxLength: 100 }) }) }
	);
