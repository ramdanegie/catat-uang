<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { expenses, softDeleteExpense } from '$lib/dummy/store';
	import { categoryById } from '$lib/api/mockClient';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { formatDateID, formatIDR } from '$lib/utils/format';

	const id = $derived(page.params.id);
	const expense = $derived($expenses.find((e) => e.id === id));
	const cat = $derived(expense ? categoryById(expense.category_id) : undefined);

	let confirmDelete = $state(false);

	function doDelete() {
		if (!expense) return;
		if (!confirmDelete) {
			confirmDelete = true;
			return;
		}
		softDeleteExpense(expense.id)
			.then(() => goto('/dashboard'))
			.catch(() => {
				confirmDelete = false;
			});
	}
</script>

{#if !expense}
	<PageHeader title="Tidak ditemukan" subtitle="Transaksi mungkin sudah dihapus." />
	<a href="/dashboard" class="mt-2 block rounded-xl bg-zinc-900 py-3 text-center text-sm font-bold text-white">Kembali ke dashboard</a>
{:else}
	<PageHeader title={expense.description} subtitle={`${formatDateID(expense.transaction_date)} · ${cat?.name ?? ''}`} />

	<div class="rounded-3xl bg-zinc-900 p-5 text-white">
		<p class="text-xs opacity-70">Nominal</p>
		<p class="text-3xl font-extrabold tabular-nums">{formatIDR(expense.amount)}</p>
		<p class="mt-2 flex items-center gap-1.5 text-xs opacity-70">
			<AppIcon name={cat?.icon ?? 'shapes'} size={14} /> {cat?.name} · {expense.payment_method ?? '—'}
		</p>
	</div>

	<dl class="mt-4 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
		<div class="flex justify-between"><dt class="text-zinc-500">Keterangan</dt><dd class="font-semibold">{expense.description}</dd></div>
		<div class="flex justify-between"><dt class="text-zinc-500">Tanggal</dt><dd class="font-semibold">{expense.transaction_date}</dd></div>
		<div class="flex justify-between"><dt class="text-zinc-500">Kategori</dt><dd class="font-semibold">{cat?.name}</dd></div>
		<div class="flex justify-between"><dt class="text-zinc-500">Metode</dt><dd class="font-semibold">{expense.payment_method ?? '—'}</dd></div>
		{#if expense.note}<div class="flex justify-between gap-4"><dt class="text-zinc-500">Catatan</dt><dd class="text-right font-semibold">{expense.note}</dd></div>{/if}
		<div class="flex justify-between"><dt class="text-zinc-500">ID</dt><dd class="font-mono text-xs">{expense.id}</dd></div>
	</dl>

	<div class="mt-4 grid grid-cols-2 gap-2">
		<a href={`/expenses/${expense.id}/edit`} class="rounded-xl bg-brand-600 py-3 text-center text-sm font-bold text-white">Ubah</a>
		<button
			onclick={doDelete}
			class="rounded-xl py-3 text-sm font-bold {confirmDelete ? 'bg-gred-600 text-white' : 'border border-gred-200 text-gred-600 dark:border-gred-500/40'}"
		>
			{confirmDelete ? 'Yakin? Klik lagi' : 'Hapus'}
		</button>
	</div>
	{#if confirmDelete}<p class="mt-2 text-center text-[11px] text-zinc-500">Mode dummy memakai soft-delete — data tetap ada dengan flag deleted_at.</p>{/if}
{/if}
