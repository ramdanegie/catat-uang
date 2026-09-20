export function formatIDR(n: number): string {
	return 'Rp' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatCompactIDR(n: number): string {
	if (Math.abs(n) >= 1_000_000) {
		const v = n / 1_000_000;
		return `Rp${v.toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
	}
	if (Math.abs(n) >= 1_000) {
		const v = n / 1_000;
		return `Rp${v.toLocaleString('id-ID', { maximumFractionDigits: 1 })} rb`;
	}
	return formatIDR(n);
}

export function formatDateID(iso: string): string {
	const [y, m, d] = iso.split('-').map(Number);
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
	return `${d} ${months[m - 1]} ${y}`;
}

export function formatMonthID(ym: string): string {
	const [y, m] = ym.split('-').map(Number);
	const months = [
		'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
		'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
	];
	return `${months[m - 1]} ${y}`;
}

export function pctChange(curr: number, prev: number): number | null {
	if (!prev || prev <= 0) return null;
	return ((curr - prev) / prev) * 100;
}

export function formatPct(v: number | null): string {
	if (v === null || !isFinite(v)) return '—';
	const sign = v > 0 ? '+' : '';
	return `${sign}${v.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`;
}

export function monthKeyOf(dateStr: string): string {
	return dateStr.slice(0, 7);
}

export function prevMonthKey(ym: string): string {
	const [y, m] = ym.split('-').map(Number);
	const d = new Date(y, m - 2, 1);
	const mm = d.getMonth() + 1;
	return `${d.getFullYear()}-${mm < 10 ? '0' + mm : '' + mm}`;
}

export function uid(prefix = 'id'): string {
	return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function toCSV(rows: Record<string, unknown>[]): string {
	if (rows.length === 0) return '';
	const headers = Object.keys(rows[0]);
	const esc = (v: unknown) => {
		const s = v === null || v === undefined ? '' : String(v);
		return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
	};
	return [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
}

export function downloadText(filename: string, text: string, mime = 'text/csv') {
	const blob = new Blob([text], { type: `${mime};charset=utf-8` });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}
