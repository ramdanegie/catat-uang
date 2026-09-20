<script lang="ts">
	import { mockApi, categoryById } from '$lib/api/mockClient';
	import { ApiError } from '$lib/api/client';
	import { budgetItems, budgets, categories, expenses, monthStr, reviewNotes, saveReviewNote } from '$lib/dummy/store';
	import DonutChart from '$lib/components/DonutChart.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { budgetUsage } from '$lib/utils/analytics';
	import { formatIDR, formatMonthID, formatPct } from '$lib/utils/format';

	let month = $state(monthStr);
	const review = $derived(mockApi.getReview(month).data);
	const budget = $derived($budgets.find((b) => b.month === month));
	const usage = $derived(budgetUsage($expenses, budget, $budgetItems));
	const savedNote = $derived($reviewNotes.find((r) => r.month === month)?.note ?? '');
	let note = $state('');
	let saved = $state(false);
	let noteError = $state('');

	$effect(() => {
		note = savedNote;
		saved = false;
	});

	function saveNote(e: Event) {
		e.preventDefault();
		noteError = '';
		saveReviewNote(month, note)
			.then(() => {
				saved = true;
			})
			.catch((err) => {
				noteError = err instanceof ApiError ? err.message : 'Gagal menyimpan catatan. Coba lagi.';
			});
	}

	const donut = $derived(
		review.by_category.map((c: { category_id: string; total: number }) => {
			const cat = categoryById(c.category_id);
			return { label: cat?.name ?? c.category_id, value: c.total, color: cat?.color ?? '#888' };
		})
	);
</script>

<PageHeader title="Evaluasi Akhir Bulan" subtitle="Refleksi tanpa menghakimi — fakta angka dulu" />

<div class="flex gap-2 rounded-2xl border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
	<label class="flex flex-1 items-center gap-2 text-xs">Bulan
		<input type="month" bind:value={month} class="w-full rounded-lg border border-zinc-200 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-800" />
	</label>
</div>

{#if review.transaction_count === 0}
	<div class="mt-3"><EmptyState title="Belum ada data bulan ini" subtitle="Catat pengeluaran agar ringkasan bisa dibuat." /></div>
{:else}
	<section class="mt-3 grid grid-cols-2 gap-3">
		<div class="col-span-2 rounded-3xl bg-gradient-to-br from-brand-50 to-brand-100 p-5 text-zinc-900 dark:from-brand-500/25 dark:to-brand-500/10 dark:text-white">
			<p class="text-xs opacity-70">Total {formatMonthID(month)}</p>
			<p class="text-3xl font-extrabold tabular-nums">{formatIDR(review.current_total)}</p>
			<p class="mt-1 text-xs opacity-70">{review.transaction_count} transaksi · rata-rata {formatIDR(Math.round(review.average_daily))}/hari</p>
		</div>
		<div class="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
			<p class="text-[11px] text-zinc-500">Kategori terbesar</p>
			{#if review.top_category}
				{@const c = categoryById(review.top_category.category_id)}
				<p class="mt-0.5 flex items-center gap-1.5 text-sm font-bold">
					<span style="color:{c?.color}"><AppIcon name={c?.icon ?? 'shapes'} size={16} /></span>
					<span class="truncate">{c?.name}</span>
				</p>
				<p class="text-[11px] text-zinc-500 tabular-nums">{formatIDR(review.top_category.total)} · {review.top_category.pct.toFixed(0)}%</p>
			{:else}<p>—</p>{/if}
		</div>
		<div class="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
			<p class="text-[11px] text-zinc-500">Budget vs aktual</p>
			{#if budget}
				<p class="mt-0.5 text-sm font-bold tabular-nums">{usage.pct.toFixed(0)}% terpakai</p>
				<p class="text-[11px] text-zinc-500 tabular-nums">{formatIDR(usage.used)} / {formatIDR(budget.total_amount)}</p>
			{:else}
				<p class="mt-0.5 text-sm font-bold">Belum ada budget</p>
				<a href="/budgets" class="text-[11px] font-semibold text-brand-600">Atur budget →</a>
			{/if}
		</div>
	</section>

	<section class="mt-3 rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
		<h2 class="text-sm font-bold">Perbandingan bulan lalu</h2>
		{#if review.previous_total === null}
			<p class="mt-2 rounded-xl bg-zinc-100 p-3 text-xs text-zinc-500 dark:bg-zinc-800">
				Data bulan sebelumnya belum tersedia — persentase tidak ditampilkan agar tidak menyesatkan (PRD BR-04).
			</p>
		{:else}
			<div class="mt-2 grid grid-cols-3 gap-2 text-center">
				<div class="rounded-xl bg-zinc-50 p-2.5 dark:bg-zinc-800"><p class="text-[10px] text-zinc-500">Bulan lalu</p><p class="text-xs font-bold tabular-nums">{formatIDR(review.previous_total)}</p></div>
				<div class="rounded-xl bg-zinc-50 p-2.5 dark:bg-zinc-800"><p class="text-[10px] text-zinc-500">Bulan ini</p><p class="text-xs font-bold tabular-nums">{formatIDR(review.current_total)}</p></div>
				<div class="rounded-xl p-2.5 {(review.absolute_change ?? 0) <= 0 ? 'bg-ggreen-50 dark:bg-ggreen-500/15' : 'bg-gred-50 dark:bg-gred-500/15'}">
					<p class="text-[10px] text-zinc-500">Perubahan</p>
					<p class="text-xs font-bold tabular-nums">{formatPct(review.percentage_change)}</p>
				</div>
			</div>
			<p class="mt-2 text-xs text-zinc-500 tabular-nums">
				Selisih {(review.absolute_change ?? 0) >= 0 ? '+' : '−'}{formatIDR(Math.abs(review.absolute_change ?? 0))}
			</p>
		{/if}
	</section>

	<section class="mt-3 rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
		<h2 class="text-sm font-bold">Distribusi kategori</h2>
		<div class="mt-2"><DonutChart segments={donut} /></div>
	</section>

	<form onsubmit={saveNote} class="mt-3 rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
		<h2 class="text-sm font-bold">Catatan evaluasi</h2>
		<p class="text-xs text-zinc-500">cth: “Bulan ini transportasi naik karena perjalanan dinas.”</p>
		<textarea bind:value={note} rows="3" placeholder="Tulis refleksimu bulan ini…" class="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none focus:border-brand-400 dark:border-zinc-700 dark:bg-zinc-800"></textarea>
		<button class="mt-2 w-full rounded-xl bg-zinc-900 py-2.5 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">Simpan catatan</button>
		{#if saved}<p class="mt-1.5 text-center text-xs text-ggreen-600">Tersimpan ✓</p>{/if}
		{#if noteError}<p class="mt-1.5 text-center text-xs text-gred-600">{noteError}</p>{/if}
	</form>
{/if}
