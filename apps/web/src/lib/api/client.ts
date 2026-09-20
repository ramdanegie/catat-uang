// Typed API client untuk backend Elysia (`/api/v1`, envelope PRD §14).
// Aktif bila VITE_API_URL di-set (cth. http://localhost:3001).
// Tanpa itu frontend berjalan mode dummy (localStorage) seperti sebelumnya.

// Aturan mode:
// - VITE_API_URL tidak di-set  -> mode dummy (localStorage, tanpa backend).
// - VITE_API_URL di-set (termasuk string kosong) -> mode backend.
//   Nilai kosong berarti same-origin (`/api/v1` di host yang sama) — wajib
//   untuk single-service production agar tidak terkunci ke localhost.
const RAW = import.meta.env.VITE_API_URL;
const BASE = (RAW ?? '').replace(/\/$/, '');

export const apiMode = RAW !== undefined;
export const apiBase = BASE;

export class ApiError extends Error {
	code: string;
	fields?: Record<string, string>;
	status: number;

	constructor(code: string, message: string, status: number, fields?: Record<string, string>) {
		super(message);
		this.code = code;
		this.status = status;
		this.fields = fields;
	}
}

const TOKEN_KEY = 'cuh.token';

export function getToken(): string | null {
	try {
		return localStorage.getItem(TOKEN_KEY);
	} catch {
		return null;
	}
}

export function setToken(t: string | null) {
	try {
		if (t) localStorage.setItem(TOKEN_KEY, t);
		else localStorage.removeItem(TOKEN_KEY);
	} catch {
		/* abaikan */
	}
}

export async function api<T>(path: string, opts: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
	const headers: Record<string, string> = { 'Content-Type': 'application/json' };
	if (opts.auth !== false) {
		const token = getToken();
		if (token) headers.Authorization = `Bearer ${token}`;
	}
	let res: Response;
	try {
		res = await fetch(`${BASE}${path}`, {
			method: opts.method ?? 'GET',
			headers,
			body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
		});
	} catch {
		throw new ApiError('NETWORK_ERROR', 'Tidak dapat menghubungi server. Pastikan backend berjalan.', 0);
	}
	const json = (await res.json().catch(() => null)) as {
		success?: boolean;
		data?: T;
		error?: { code?: string; message?: string; fields?: Record<string, string> };
	} | null;
	if (!res.ok || !json?.success) {
		throw new ApiError(
			json?.error?.code ?? 'REQUEST_FAILED',
			json?.error?.message ?? `HTTP ${res.status}`,
			res.status,
			json?.error?.fields
		);
	}
	return json.data as T;
}
