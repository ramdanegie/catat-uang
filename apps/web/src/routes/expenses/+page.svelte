<script lang="ts">
	import { mockApi, categoryById } from '$lib/api/mockClient';
	import { categories, monthStr } from '$lib/dummy/store';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ExpenseRow from '$lib/components/ExpenseRow.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { formatIDR } from '$lib/utils/format';

	let q = $state('');
	let catFilter = $state('');
	let from = $state(monthStr + '-01');
	let to = $state('');

	const res = $derived(mockApi.listExpenses({ q, category_id: catFilter || undefined, from: from || undefined, to: to || undefined }).data);
	const total = $derived(res.reduce((a: number, e: { amount: number }) => a + e.amount, 0));
</script>

<PageHeader title="Riwayat Pengeluaran" subtitle={`${res.length} transaksi · ${formatIDR(total)}`} />

<div class="space-y-2 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
	<input bind:value={q} placeholder="Cari keterangan…" class="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none focus:border-brand-400 dark:border-zinc-700 dark:bg-zinc-800" />
	<div class="grid grid-cols-2 gap-2">
		<select bind:value={catFilter} class="rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-2.5 text-xs dark:border-zinc-700 dark:bg-zinc-800">
			<option value="">Semua kategori</option>
			{#each $categories as c (c.id)}<option value={c.id}>{c.icon} {c.name}</option>{/each}
		</select>
		<a href="/expenses/new" class="rounded-xl bg-brand-600 py-2.5 text-center text-xs font-bold text-white">+ Catat baru</a>
	</div>
	<div class="grid grid-cols-2 gap-2 text-xs">
		<label class="flex items-center gap-1.5">Dari <input type="date" bind:value={from} class="w-full rounded-lg border border-zinc-200 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-800" /></label>
		<label class="flex items-center gap-1.5">S/d <input type="date" bind:value={to} class="w-full rounded-lg border border-zinc-200 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-800" /></label>
	</div>
</div>

<div class="mt-3 space-y-2">
	{#if res.length === 0}
		<EmptyState title="Tidak ada transaksi" subtitle="Ubah filter atau catat pengeluaran baru." />
	{:else}
		{#each res.slice(0, 100) as e (e.id)}
			<ExpenseRow expense={e} />
		{/each}
		{#if res.length > 100}<p class="py-2 text-center text-xs text-zinc-400">Menampilkan 100 pertama dari {res.length}</p>{/if}
	{/if}
</div>
