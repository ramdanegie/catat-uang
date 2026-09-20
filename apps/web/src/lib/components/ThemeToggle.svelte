<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { prefs } from '$lib/dummy/store';

	// Tombol toggle tema: Sistem -> Terang -> Gelap -> Sistem ...
	let { size = 18, showLabel = false, class: cls = '' }: { size?: number; showLabel?: boolean; class?: string } =
		$props();

	const order = ['system', 'light', 'dark'];
	const meta: Record<string, { icon: string; label: string }> = {
		system: { icon: 'monitor-smartphone', label: 'Sistem' },
		light: { icon: 'sun', label: 'Terang' },
		dark: { icon: 'moon', label: 'Gelap' }
	};

	const cur = $derived(meta[$prefs.theme] ?? meta.system);

	function cycle() {
		const i = order.indexOf($prefs.theme);
		$prefs.theme = order[(i + 1) % order.length];
	}
</script>

<button
	onclick={cycle}
	title="Tema: {cur.label} — klik untuk ganti"
	aria-label="Ganti tema (saat ini: {cur.label})"
	class="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-100 {showLabel ? 'px-3 py-2' : 'h-9 w-9'} dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 {cls}"
>
	<AppIcon name={cur.icon} size={size} />
	{#if showLabel}<span class="text-xs font-bold">{cur.label}</span>{/if}
</button>
