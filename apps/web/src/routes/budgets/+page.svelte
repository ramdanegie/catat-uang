<script lang="ts">
	import { budgetItems, budgets, categories, expenses, monthStr, upsertBudget } from '$lib/dummy/store';
	import { categoryById } from '$lib/api/mockClient';
	import { ApiError } from '$lib/api/client';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import CurrencyInput from '$lib/components/CurrencyInput.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import { STATUS_META, budgetUsage } from '$lib/utils/analytics';
	import { formatIDR, formatMonthID } from '$lib/utils/format';

	let month = $state(monthStr);
	let editing = $state(false);
	let saveError = $state('');
	let totalNum = $state(5000000);
	let perCat: Record<string, number> = $state({});

	const budget = $derived($budgets.find((b) => b.month === month));
	const items = $derived($budgetItems.filter((i) => i.budget_id === budget?.id));
	const usage = $derived(budgetUsage($expenses, budget, $budgetItems));
	const meta = $derived(STATUS_META[usage.status]);

	function startEdit() {
		editing = true;
		totalNum = budget ? budget.total_amount : 5000000;
		perCat = {};
		// Hanya kategori aktif — sama dengan daftar yang dirender di form.
		for (const c of $categories.filter((c) => c.is_active)) {
			perCat[c.id] = items.find((i) => i.category_id === c.id)?.amount ?? 0;
		}
	}

	function save(e: Event) {
		e.preventDefault();
		if (totalNum <= 0) return;
		saveError = '';
		upsertBudget(
			month,
			totalNum,
			Object.entries(perCat).map(([category_id, amount]) => ({ category_id, amount }))
		)
			.then(() => {
				editing = false;
			})
			.catch((err) => {
				saveError = err instanceof ApiError ? err.message : 'Gagal menyimpan budget. Coba lagi.';
			});
	}
</script>

<PageHeader title="Budget Bulanan" subtitle="Atur batas sebelum uang habis" />

<div class="flex gap-2 rounded-2xl border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
	<label class="flex flex-1 items-center gap-2 text-xs">Bulan
		<input type="month" bind:value={month} class="w-full rounded-lg border border-zinc-200 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-800" />
	</label>
	<button onclick={startEdit} class="rounded-xl bg-zinc-900 px-4 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
		{budget ? 'Ubah' : 'Buat'}
	</button>
</div>

{#if editing}
	<form onsubmit={save} class="mt-3 space-y-3 rounded-3xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
		<h2 class="text-sm font-bold">Budget {formatMonthID(month)}</h2>
		<label class="block">
			<span class="mb-1 block text-xs font-semibold">Total budget</span>
			<div class="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900">
				<CurrencyInput id="budget-total" bind:value={totalNum} placeholder="0" inputClass="text-lg" />
			</div>
		</label>
		<div class="space-y-2">
			<p class="text-xs font-semibold">Budget per kategori (opsional)</p>
			{#each $categories.filter((c) => c.is_active) as c (c.id)}
				<label class="flex items-center gap-2 text-xs">
					<span class="flex w-32 shrink-0 items-center gap-1.5 truncate">
						<AppIcon name={c.icon} size={16} />
						<span class="truncate">{c.name}</span>
					</span>
					<span class="flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900">
						<CurrencyInput id={`budget-cat-${c.id}`} bind:value={perCat[c.id]} inputClass="text-xs" />
					</span>
				</label>
			{/each}
		</div>
		<div class="grid grid-cols-2 gap-2">
			<button type="button" onclick={() => (editing = false)} class="rounded-xl border border-zinc-300 py-2.5 text-xs font-bold">Batal</button>
			<button type="submit" class="rounded-xl bg-brand-600 py-2.5 text-xs font-bold text-white">Simpan budget</button>
		</div>
		{#if saveError}<p class="text-center text-xs text-gred-600">{saveError}</p>{/if}
	</form>
{/if}

{#if !budget}
	<div class="mt-3">
		<EmptyState title="Belum ada budget" subtitle={`Tetapkan budget untuk ${formatMonthID(month)} agar pemakaian terpantau.`} />
	</div>
{:else}
	<section class="mt-3 rounded-3xl bg-gradient-to-br from-brand-50 to-brand-100 p-5 text-zinc-900 dark:from-brand-500/25 dark:to-brand-500/10 dark:text-white">
		<div class="flex items-center justify-between">
			<p class="text-xs opacity-70">Terpakai dari {formatIDR(budget.total_amount)}</p>
			<span class="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold">{meta.label} · {usage.pct.toFixed(0)}%</span>
		</div>
		<p class="mt-1 text-3xl font-extrabold tabular-nums">{formatIDR(usage.used)}</p>
		<div class="mt-3"><ProgressBar value={usage.used} max={budget.total_amount} barClass={meta.bar} height="h-3" /></div>
		<p class="mt-2 text-xs opacity-70">
			Sisa <b class="text-zinc-900 dark:text-white">{formatIDR(usage.remaining)}</b>
			{#if usage.remaining < 0}· over budget {formatIDR(Math.abs(usage.remaining))}{/if}
		</p>
	</section>

	<section class="mt-3 space-y-2">
		<h2 class="text-sm font-bold">Budget per kategori</h2>
		{#if usage.perCategory.length === 0}
			<EmptyState title="Belum ada budget kategori" subtitle="Klik Ubah untuk menambah batas per kategori." />
		{:else}
			{#each usage.perCategory as pc (pc.category_id)}
				{@const c = categoryById(pc.category_id)}
				{@const m = STATUS_META[pc.status]}
				<div class="rounded-2xl border border-zinc-200 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900">
					<div class="flex items-center justify-between gap-2 text-xs">
						<span class="flex min-w-0 items-center gap-1.5 font-bold">
							<AppIcon name={c?.icon ?? 'shapes'} size={16} />
							<span class="truncate">{c?.name}</span>
						</span>
						<span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold {m.classes}">{m.label} · {pc.pct.toFixed(0)}%</span>
					</div>
					<div class="mt-2"><ProgressBar value={pc.used} max={pc.limit} barClass={m.bar} /></div>
					<div class="mt-1.5 flex justify-between text-[11px] text-zinc-500">
						<span>{formatIDR(pc.used)} / {formatIDR(pc.limit)}</span>
						<span>Sisa {formatIDR(pc.limit - pc.used)}</span>
					</div>
				</div>
			{/each}
		{/if}
	</section>

	<div class="mt-3 rounded-2xl border border-zinc-200 bg-white p-3 text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
		Status: Normal &lt;70% · Warning 70–89% · Critical 90–99% · Exceeded ≥100% (PRD §5.4C). Berubah otomatis saat transaksi ditambah/diubah/dihapus.
	</div>
{/if}
