<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { authUser, apiMode, dummyLogout, prefs, restoreSession } from '$lib/dummy/store';
	import { applyTheme } from '$lib/utils/theme';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';

	let { children } = $props();

	const publicPaths = ['/login', '/register'];
	const hideChrome = $derived(publicPaths.some((p) => page.url.pathname.startsWith(p)));

	const nav = [
		{ href: '/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
		{ href: '/expenses', label: 'Riwayat', icon: 'history' },
		{ href: '/expenses/new', label: 'Catat', icon: 'circle-plus' },
		{ href: '/trends', label: 'Trend', icon: 'chart-column' },
		{ href: '/budgets', label: 'Budget', icon: 'wallet' },
		{ href: '/review', label: 'Review', icon: 'clipboard-list' },
		{ href: '/insights', label: 'Saran', icon: 'lightbulb' },
		{ href: '/reminders', label: 'Pengingat', icon: 'bell-ring' },
		{ href: '/settings', label: 'Pengaturan', icon: 'settings' }
	];

	// Sidebar desktop bisa diciutkan; preferensi tersimpan di browser.
	let collapsed = $state(browser && localStorage.getItem('cuh.sidebar.v1') === '1');
	let restoring = $state(false);
	// Restore sesi hanya boleh dicoba sekali per load. Tanpa penanda ini,
	// pengunjung tanpa token membuat efek di bawah berputar tanpa henti:
	// restoring true -> restoreSession() selesai seketika -> restoring false
	// -> syarat terpenuhi lagi. Svelte menghentikannya dengan
	// `effect_update_depth_exceeded`, dan halaman berakhir putih.
	let restoreTried = $state(false);

	function toggleSidebar() {
		collapsed = !collapsed;
		try {
			localStorage.setItem('cuh.sidebar.v1', collapsed ? '1' : '0');
		} catch {
			/* abaikan */
		}
	}

	function handleLogout() {
		dummyLogout();
		goto('/login');
	}

	// Terapkan theme (light/dark/system) setiap preferensi berubah.
	$effect(() => {
		applyTheme($prefs.theme);
	});

	$effect(() => {
		if (!browser || hideChrome) return;
		// Mode API: selalu pulihkan sesi sekali per load — verifikasi token ke
		// /me sekaligus menarik ulang data server yang tidak dipersist.
		if (apiMode && !restoreTried && !restoring) {
			restoring = true;
			restoreTried = true;
			restoreSession().finally(() => {
				restoring = false;
			});
			return;
		}
		if (!$authUser && !restoring) goto('/login');
	});

	function isActive(href: string): boolean {
		const p = page.url.pathname;
		if (href === '/dashboard') return p === '/' || p === '/dashboard';
		if (href === '/expenses') return p === '/expenses' || /^\/expenses\/[^/]+$/.test(p);
		return p.startsWith(href);
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Catat Uang Hemat</title>
	<meta name="description" content="Catat pengeluaran, pahami pola, atur budget — frontend dummy phase." />
</svelte:head>

{#if hideChrome}
	<div class="min-h-dvh bg-zinc-50 dark:bg-zinc-950">
		{@render children()}
	</div>
{:else}
	<div class="min-h-dvh bg-zinc-50 text-zinc-900 md:flex dark:bg-zinc-950 dark:text-zinc-100">
		<!-- Sidebar desktop (bisa collapse) -->
		<aside
			class="sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-zinc-200 bg-white transition-all duration-200 md:flex dark:border-zinc-800 dark:bg-zinc-950 {collapsed
				? 'w-[76px] px-3 py-4'
				: 'w-60 p-4'}"
		>
			<a
				href="/dashboard"
				title="Catat Uang Hemat"
				class="flex items-center gap-2.5 rounded-2xl bg-brand-600/10 {collapsed ? 'justify-center p-2.5' : 'p-3'}"
			>
				<span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
					<AppIcon name="wallet" size={20} />
				</span>
				{#if !collapsed}
					<span class="block text-sm font-bold">Catat Uang Hemat</span>
				{/if}
			</a>
			<nav class="mt-4 flex-1 space-y-1 overflow-y-auto">
				{#each nav as n (n.href)}
					<a
						href={n.href}
						title={collapsed ? n.label : undefined}
						class="flex items-center gap-3 rounded-xl py-2 text-sm font-medium transition {collapsed
							? 'justify-center px-0'
							: 'px-3'} {isActive(n.href)
							? 'bg-brand-600/10 text-brand-700 dark:text-brand-300'
							: 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900'}"
					>
						<AppIcon name={n.icon} size={18} />
						{#if !collapsed}{n.label}{/if}
					</a>
				{/each}
			</nav>
			{#if $authUser}
				<div
					class="mt-3 flex items-center gap-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 {collapsed
						? 'justify-center p-2'
						: 'p-2.5'}"
					title={collapsed ? $authUser.name : undefined}
				>
					{#if $authUser.avatar_url}
						<img src={$authUser.avatar_url} alt={$authUser.name} referrerpolicy="no-referrer" class="h-8 w-8 shrink-0 rounded-full object-cover" />
					{:else}
						<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
							{$authUser.name.slice(0, 1).toUpperCase()}
						</span>
					{/if}
					{#if !collapsed}
						<span class="min-w-0 flex-1">
							<span class="block truncate text-xs font-semibold">{$authUser.name}</span>
							<span class="block truncate text-[11px] text-zinc-500">{$authUser.email}</span>
						</span>
					{/if}
				</div>
			{/if}
			<div class="mt-2 flex {collapsed ? 'flex-col items-center' : 'items-center'} gap-2">
				<ThemeToggle size={17} showLabel={!collapsed} class={collapsed ? '' : 'flex-1'} />
				<button
					onclick={handleLogout}
					title="Keluar"
					aria-label="Keluar"
					class="flex h-9 w-9 items-center justify-center rounded-xl border border-gred-200 bg-white text-gred-600 transition hover:bg-gred-50 dark:border-gred-500/40 dark:bg-zinc-900 dark:text-gred-300 dark:hover:bg-gred-500/15"
				>
					<AppIcon name="log-out" size={17} />
				</button>
				<button
					onclick={toggleSidebar}
					title={collapsed ? 'Bentangkan sidebar' : 'Ciutkan sidebar'}
					aria-label={collapsed ? 'Bentangkan sidebar' : 'Ciutkan sidebar'}
					class="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
				>
					<AppIcon name={collapsed ? 'panel-left-open' : 'panel-left-close'} size={17} />
				</button>
			</div>
		</aside>

		<!-- Topbar mobile: logo + toggle tema. Sengaja tidak sticky — ikut
		     tergulung hilang saat scroll supaya layar HP lega; navigasi tetap
		     terjangkau lewat BottomNav yang menempel di bawah. -->
		<header class="border-b border-zinc-200 bg-white/90 backdrop-blur md:hidden dark:border-zinc-800 dark:bg-zinc-950/90">
			<div class="mx-auto flex max-w-md items-center gap-2 px-4 py-2.5">
				<a href="/dashboard" class="flex min-w-0 items-center gap-2">
					<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
						<AppIcon name="wallet" size={17} />
					</span>
					<span class="truncate text-sm font-extrabold tracking-tight">Catat Uang Hemat</span>
				</a>
				<span class="flex-1"></span>
				<ThemeToggle size={17} />
			</div>
		</header>

		<!-- Main -->
		<main class="min-w-0 flex-1">
			<div class="mx-auto w-full max-w-md px-4 pt-5 pb-28 md:max-w-3xl md:px-8 md:pt-8 md:pb-12">
				{@render children()}
			</div>
		</main>

		<BottomNav />
	</div>
{/if}
