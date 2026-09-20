// Google OAuth 2.0 (authorization code flow) — PRD auth extension.
// Setup: Google Cloud Console → APIs & Services → Credentials → OAuth client ID
// (type Web). Authorized redirect URI wajib:
//   <API_ORIGIN>/api/v1/auth/google/callback
// Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, FRONTEND_URL.

export function googleConfigured() {
	return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI);
}

export function frontendBase() {
	return (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, '');
}

export function buildAuthUrl(state: string) {
	const params = new URLSearchParams({
		client_id: process.env.GOOGLE_CLIENT_ID ?? '',
		redirect_uri: process.env.GOOGLE_REDIRECT_URI ?? '',
		response_type: 'code',
		scope: 'openid email profile',
		access_type: 'online',
		prompt: 'select_account',
		state
	});
	return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function randomState() {
	return [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

type TokenResponse = { access_token?: string; error?: string; error_description?: string };

export async function exchangeCode(code: string): Promise<string> {
	const res = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			code,
			client_id: process.env.GOOGLE_CLIENT_ID ?? '',
			client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
			redirect_uri: process.env.GOOGLE_REDIRECT_URI ?? '',
			grant_type: 'authorization_code'
		}).toString()
	});
	const json = (await res.json().catch(() => ({}))) as TokenResponse;
	if (!res.ok || !json.access_token) {
		throw new Error(json.error_description ?? json.error ?? 'Gagal menukar kode Google');
	}
	return json.access_token;
}

export type GoogleProfile = { sub: string; email: string; name: string; picture?: string };

export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
	const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
		headers: { Authorization: `Bearer ${accessToken}` }
	});
	if (!res.ok) throw new Error('Gagal membaca profil Google');
	const json = (await res.json()) as Record<string, unknown>;
	if (typeof json.sub !== 'string' || typeof json.email !== 'string') throw new Error('Profil Google tidak lengkap');
	return {
		sub: json.sub,
		email: String(json.email).toLowerCase(),
		name: typeof json.name === 'string' && json.name ? json.name : String(json.email).split('@')[0],
		picture: typeof json.picture === 'string' ? json.picture : undefined
	};
}
