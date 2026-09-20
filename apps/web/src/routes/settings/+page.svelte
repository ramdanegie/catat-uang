<script lang="ts">
	import { goto } from '$app/navigation';
	import { activeExpenses } from '$lib/dummy/store';
	import { authUser, apiMode, categories, dummyLogout, prefs, reminders, renameUser, resetDemoData } from '$lib/dummy/store';
	import { categoryById } from '$lib/api/mockClient';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { downloadText, toCSV } from '$lib/utils/format';

	const themeOptions = [
		{ v: 'light', l: 'Terang', i: 'sun' },
		{ v: 'system', l: 'Sistem', i: 'monitor-smartphone' },
		{ v: 'dark', l: 'Gelap', i: 'moon' }
	];

	let exported = $state(false);
	let resetted = $state(false);

	function exportCSV() {
		const rows = $activeExpenses.map((e) => ({
			transaction_id: e.id,
			date: e.transaction_date,
			description: e.description,
			category: categoryById(e.category_id)?.name ?? e.category_id,
			amount: e.amount,
			payment_method: e.payment_method ?? '',
			created_at: e.created_at
		}));
		downloadText(`catat-uang-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows));
		exported = true;
		setTimeout(() => (exported = false), 3000);
	}

	async function logout() {
		await dummyLogout();
		goto('/login');
	}

	function reset() {
		resetDemoData();
		resetted = true;
		setTimeout(() => (resetted = false), 3000);
	}
</script>

<PageHeader title="Akun & Pengaturan" subtitle="Preferensi, data, dan ekspor" />

<section class="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
	<h2 class="flex items-center gap-2 text-sm font-bold"><AppIcon name="user-round" size={17} /> Profil</h2>
	<div class="mt-2 flex items-center gap-3">
		{#if $authUser?.avatar_url}
			<img src={$authUser.avatar_url} alt={$authUser.name} referrerpolicy="no-referrer" class="h-11 w-11 rounded-full object-cover" />
		{:else}
			<span class="flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white">
				{$authUser?.name?.slice(0, 1).toUpperCase() ?? '?'}
			</span>
		{/if}
		<div class="min-w-0 flex-1">
			<p class="truncate text-sm font-bold">{$authUser?.name ?? 'Tamu'}</p>
			<p class="truncate text-xs text-zinc-500">{$authUser?.email ?? '—'}</p>
		</div>
	</div>
	<label class="mt-3 block text-xs">Nama tampilan
		<input
			value={$authUser?.name ?? ''}
			oninput={(e) => authUser.update((u) => (u ? { ...u, name: e.currentTarget.value } : u))}
			onchange={(e) => renameUser(e.currentTarget.value.trim() || $authUser?.name || '')}
			class="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-800"
		/>
	</label>
</section>

<section class="mt-3 rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
	<h2 class="flex items-center gap-2 text-sm font-bold"><AppIcon name="settings" size={17} /> Preferensi</h2>
	<div class="mt-2 grid grid-cols-2 gap-2 text-xs">
		<label class="block">Currency
			<select bind:value={$prefs.currency} class="mt-1 w-full rounded-xl border border-zinc-200 px-2 py-2.5 dark:border-zinc-700 dark:bg-zinc-800">
				<option value="IDR">IDR (Rupiah)</option>
			</select>
		</label>
		<label class="block">Timezone
			<select bind:value={$prefs.timezone} class="mt-1 w-full rounded-xl border border-zinc-200 px-2 py-2.5 dark:border-zinc-700 dark:bg-zinc-800">
				<option value="Asia/Jakarta">Asia/Jakarta</option>
				<option value="Asia/Makassar">Asia/Makassar</option>
				<option value="Asia/Jayapura">Asia/Jayapura</option>
			</select>
		</label>
		<label class="col-span-2 block">Tampilan
			<div class="mt-1 grid grid-cols-3 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
				{#each themeOptions as o (o.v)}
					<button
						type="button"
						onclick={() => ($prefs.theme = o.v)}
						class="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition {$prefs.theme === o.v
							? 'bg-white text-zinc-900 shadow dark:bg-zinc-950 dark:text-zinc-50'
							: 'text-zinc-500 dark:text-zinc-400'}"
					>
						<AppIcon name={o.i} size={14} /> {o.l}
					</button>
				{/each}
			</div>
			<p class="mt-1 text-[11px] text-zinc-500">Sistem = mengikuti tema HP/laptop otomatis.</p>
		</label>
		<label class="block">Awal periode
			<select class="mt-1 w-full rounded-xl border border-zinc-200 px-2 py-2.5 dark:border-zinc-700 dark:bg-zinc-800">
				<option>Tanggal 1</option>
			</select>
		</label>
	</div>
	<p class="mt-2 text-[11px] text-zinc-500">{$categories.length} kategori aktif · pengingat harian {$reminders.daily_enabled ? 'ON ' + $reminders.daily_time : 'OFF'}</p>
</section>

<section class="mt-3 rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
	<h2 class="flex items-center gap-2 text-sm font-bold"><AppIcon name="download" size={17} /> Ekspor data</h2>
	<p class="mt-1 text-xs text-zinc-500">Unduh {$activeExpenses.length} transaksi milikmu ke CSV (kolom PRD §5.8C).</p>
	<button onclick={exportCSV} class="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-2.5 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
		<AppIcon name="download" size={15} /> Download CSV
	</button>
	{#if exported}<p class="mt-1.5 text-center text-xs text-ggreen-600">CSV terunduh ✓</p>{/if}
</section>

{#if !apiMode}
<section class="mt-3 rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
	<h2 class="flex items-center gap-2 text-sm font-bold"><AppIcon name="flask-conical" size={17} /> Data dummy</h2>
	<p class="mt-1 text-xs text-zinc-500">Reset semua transaksi, budget, dan catatan ke seed awal untuk testing ulang.</p>
	<button onclick={reset} class="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-gyellow-400 py-2.5 text-xs font-bold text-gyellow-700 dark:border-gyellow-500/40 dark:text-gyellow-200">
		<AppIcon name="rotate-ccw" size={15} /> Reset ke dummy awal
	</button>
	{#if resetted}<p class="mt-1.5 text-center text-xs text-ggreen-600">Data di-reset ✓</p>{/if}
</section>
{/if}

<button onclick={logout} class="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-gred-200 py-3 text-sm font-bold text-gred-600 dark:border-gred-500/40 dark:text-gred-300">
	<AppIcon name="log-out" size={17} /> Keluar
</button>
<p class="mt-3 text-center text-[11px] text-zinc-400">Frontend-only v0.1 · SvelteKit + Tailwind · backend menyusul setelah testing dummy</p>
