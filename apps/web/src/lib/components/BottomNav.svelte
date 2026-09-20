<script lang="ts">
	import { page } from '$app/state';
	import AppIcon from '$lib/components/AppIcon.svelte';

	const tabs = [
		{ href: '/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
		{ href: '/expenses/new', label: 'Catat', icon: 'plus', primary: true },
		{ href: '/trends', label: 'Trend', icon: 'chart-column' },
		{ href: '/budgets', label: 'Budget', icon: 'wallet' },
		{ href: '/settings', label: 'Lainnya', icon: 'menu' }
	];

	function isActive(href: string): boolean {
		const p = page.url.pathname;
		if (href === '/dashboard') return p === '/' || p === '/dashboard';
		return p.startsWith(href);
	}
</script>

<nav
	class="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur md:hidden dark:border-zinc-800 dark:bg-zinc-950/95"
>
	<div class="mx-auto grid max-w-md grid-cols-5 px-1 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
		{#each tabs as t (t.href)}
			<a
				href={t.href}
				class="flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-medium transition {isActive(t.href)
					? 'text-brand-600 dark:text-brand-300'
					: 'text-zinc-500 dark:text-zinc-400'}"
			>
				{#if t.primary}
					<span class="-mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/20">
						<AppIcon name="plus" size={26} strokeWidth={2.5} />
					</span>
					<span>{t.label}</span>
				{:else}
					<AppIcon name={t.icon} size={22} />
					<span>{t.label}</span>
				{/if}
			</a>
		{/each}
	</div>
</nav>
