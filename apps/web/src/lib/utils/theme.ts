// Theme manager: 'light' | 'dark' | 'system' (default system).
// Mengatur class `.dark` pada <html> agar varian `dark:` Tailwind aktif.
// Mode system mengikuti prefers-color-scheme OS dan bereaksi saat OS berubah.

let current: string = 'system';
let listening = false;

export function applyTheme(mode: string) {
	current = mode || 'system';
	if (typeof document === 'undefined' || typeof window === 'undefined') return;
	const dark =
		current === 'dark' ||
		(current !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
	document.documentElement.classList.toggle('dark', dark);
	document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
	ensureMediaListener();
}

function ensureMediaListener() {
	if (listening || typeof window === 'undefined') return;
	listening = true;
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
		if (current === 'system') applyTheme('system');
	});
}
