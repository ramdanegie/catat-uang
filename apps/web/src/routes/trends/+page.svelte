<script lang="ts">
	import { mockApi, categoryById } from '$lib/api/mockClient';
	import { categories, expenses, monthStr } from '$lib/dummy/store';
	import BarChart from '$lib/components/BarChart.svelte';
	import DonutChart from '$lib/components/DonutChart.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { formatIDR, formatMonthID, monthKeyOf, prevMonthKey } from '$lib/utils/format';
	import { monthlySeries } from '$lib/utils/analytics';

	let month = $state(monthStr);
	let tab = $state<'harian' | 'bulanan' | 'kategori'>('harian');

	const data = $derived(mockApi.getTrends(month).data);
	const dailyChart = $derived(data.daily.map((d: { date: string; total: number }) => ({ label: d.date.slice(8), value: d.total })));
	const monthlyChart = $derived(data.monthly.map((m: { month: string; total: number }) => ({ label: m.month.slice(5), value: m.total })));
	const donut = $derived(
		data.categories.map((c: { category_id: string; total: number }) => {
			const cat = categoryById(c.category_id);
			return { label: cat?.name ?? c.category_id, value: c.total, color: cat?.color ?? '#888' };
		})
	);
	const maxDay = $derived(data.daily.reduce((a: { total: number }, b: { total: number }) => (b.total > a.total ? b : a), { total: 0 }));
</script>

<PageHeader title="Trend & Grafik" subtitle="Pahami pola pengeluaranmu" />

<div class="flex gap-2 rounded-2xl border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
	<label class="flex flex-1 items-center gap-2 text-xs">Bulan
		<input type="month" bind:value={month} class="w-full rounded-lg border border-zinc-200 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-800" />
	</label>
</div>

<div class="mt-3 grid grid-cols-3 gap-1 rounded-2xl bg-zinc-100 p-1 text-xs font-bold dark:bg-zinc-900">
	{#each [['harian', 'Harian'], ['bulanan', 'Bulanan'], ['kategori', 'Kategori']] as [v, l] (v)}
		<button onclick={() => (tab = v as typeof tab)} class="rounded-xl py-2 {tab === v ? 'bg-white shadow dark:bg-zinc-800' : 'text-zinc-500'}">{l}</button>
	{/each}
</div>

{#if tab === 'harian'}
	<section class="mt-3 rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
		<h2 class="text-sm font-bold">Pengeluaran harian — {formatMonthID(month)}</h2>
		<p class="text-xs text-zinc-500">Hari terbesar: {formatIDR(maxDay.total)}</p>
		<div class="mt-3"><BarChart data={dailyChart} height={150} /></div>
	</section>
{:else if tab === 'bulanan'}
	<section class="mt-3 rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
		<h2 class="text-sm font-bold">Perbandingan 6 bulan terakhir</h2>
		<div class="mt-3"><BarChart data={monthlyChart} height={150} /></div>
		<ul class="mt-3 space-y-1.5">
			{#each data.monthly as m (m.month)}
				<li class="flex justify-between text-xs">
					<span class={m.month === month ? 'font-bold text-brand-600' : 'text-zinc-500'}>{formatMonthID(m.month)}</span>
					<span class="font-bold tabular-nums">{formatIDR(m.total)}</span>
				</li>
			{/each}
		</ul>
	</section>
{:else}
	<section class="mt-3 rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
		<h2 class="text-sm font-bold">Distribusi kategori — {formatMonthID(month)}</h2>
		{#if donut.length === 0}
			<EmptyState title="Belum ada data" subtitle="Catat pengeluaran agar grafik muncul." />
		{:else}
			<div class="mt-3"><DonutChart segments={donut} /></div>
			<ul class="mt-3 space-y-1.5">
				{#each data.categories as c (c.category_id)}
					{@const cat = categoryById(c.category_id)}
					<li class="flex items-center gap-2 text-xs">
						<span style="color:{cat?.color}"><AppIcon name={cat?.icon ?? 'shapes'} size={14} /></span>
						<span class="flex-1">{cat?.name}</span>
						<span class="text-zinc-500">{c.count}x · {c.pct.toFixed(0)}%</span>
						<span class="w-24 text-right font-bold tabular-nums">{formatIDR(c.total)}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
{/if}
