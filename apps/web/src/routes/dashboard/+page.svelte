<script lang="ts">
	import { authUser, budgetItems, budgets, categories, expenses, monthStr, todayStr } from '$lib/dummy/store';
	import { mockApi, categoryById } from '$lib/api/mockClient';
	import { formatCompactIDR, formatDateID, formatIDR, formatMonthID } from '$lib/utils/format';
	import { STATUS_META, budgetUsage, generateInsights } from '$lib/utils/analytics';
	import BarChart from '$lib/components/BarChart.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ExpenseRow from '$lib/components/ExpenseRow.svelte';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import ProgressBar from '$lib/components/ProgressBar.svelte';

	const dash = $derived(mockApi.getDashboard(todayStr, monthStr).data);
	const budget = $derived($budgets.find((b) => b.month === monthStr));
	const usage = $derived(budgetUsage($expenses, budget, $budgetItems));
	const statusMeta = $derived(STATUS_META[usage.status]);
	const topInsights = $derived(generateInsights($expenses, $categories, monthStr, budget, $budgetItems).slice(0, 2));
	const chartData = $derived(dash.daily_series.map((d) => ({ label: d.date.slice(8), value: d.total })));

	function greeting(): string {
		const h = new Date().getHours();
		if (h < 11) return 'Selamat pagi';
		if (h < 15) return 'Selamat siang';
		if (h < 19) return 'Selamat sore';
		return 'Selamat malam';
	}
</script>

<PageHeader title={`${greeting()}, ${$authUser?.name ?? 'Teman'}`} subtitle={formatMonthID(monthStr)} />

<!-- Ringkasan hari ini -->
<section class="grid grid-cols-2 gap-3">
	<div class="col-span-2 rounded-3xl bg-gradient-to-br from-brand-50 to-brand-100 p-5 text-zinc-900 dark:from-brand-500/25 dark:to-brand-500/10 dark:text-white">
		<p class="text-xs opacity-70">Total bulan ini</p>
		<p class="mt-1 text-3xl font-extrabold tabular-nums">{formatIDR(dash.month_total)}</p>
		<p class="mt-1 text-xs opacity-70">{dash.month_count} transaksi · {formatDateID(todayStr)} hari ini {formatIDR(dash.today_total)}</p>
	</div>
	<div class="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
		<p class="text-[11px] text-zinc-500">Hari ini</p>
		<p class="mt-0.5 text-lg font-bold tabular-nums">{formatCompactIDR(dash.today_total)}</p>
		<p class="text-[11px] text-zinc-500">{dash.today_count} transaksi</p>
	</div>
	<div class="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
		<p class="text-[11px] text-zinc-500">Kategori terbesar hari ini</p>
		{#if dash.today_top_category}
			{@const c = categoryById(dash.today_top_category.category_id)}
			<p class="mt-0.5 flex items-center gap-1.5 truncate text-sm font-bold">
				<span style="color:{c?.color}"><AppIcon name={c?.icon ?? 'shapes'} size={16} /></span>
				<span class="truncate">{c?.name}</span>
			</p>
			<p class="text-[11px] text-zinc-500 tabular-nums">{formatCompactIDR(dash.today_top_category.total)}</p>
		{:else}
			<p class="mt-0.5 text-sm font-bold">—</p>
			<p class="text-[11px] text-zinc-500">Belum ada transaksi</p>
		{/if}
	</div>
</section>

<!-- Grafik bulan ini -->
<section class="mt-4 rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
	<div class="mb-2 flex items-center justify-between">
		<h2 class="text-sm font-bold">Grafik bulan ini</h2>
		<a href="/trends" class="text-xs font-semibold text-brand-600">Lihat trend →</a>
	</div>
	<BarChart data={chartData} height={130} />
</section>

<!-- Budget progress -->
<section class="mt-4 rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
	<div class="mb-2 flex items-center justify-between">
		<h2 class="text-sm font-bold">Budget {formatMonthID(monthStr)}</h2>
		<span class="rounded-full px-2.5 py-0.5 text-[11px] font-bold {statusMeta.classes}">{statusMeta.label} · {usage.pct.toFixed(0)}%</span>
	</div>
	{#if budget}
		<ProgressBar value={usage.used} max={budget.total_amount} barClass={statusMeta.bar} />
		<div class="mt-2 flex justify-between text-xs text-zinc-500">
			<span>Terpakai <b class="text-zinc-800 dark:text-zinc-100">{formatCompactIDR(usage.used)}</b></span>
			<span>Sisa <b class={usage.remaining < 0 ? 'text-gred-600' : 'text-zinc-800 dark:text-zinc-100'}>{formatCompactIDR(usage.remaining)}</b></span>
			<span>Budget <b class="text-zinc-800 dark:text-zinc-100">{formatCompactIDR(budget.total_amount)}</b></span>
		</div>
		<a href="/budgets" class="mt-3 block text-center text-xs font-semibold text-brand-600">Kelola budget →</a>
	{:else}
		<EmptyState title="Belum ada budget bulan ini" subtitle="Tetapkan batas pengeluaran agar tetap aman." />
		<a href="/budgets" class="mt-3 block rounded-xl bg-brand-600 py-2.5 text-center text-sm font-bold text-white">Atur budget</a>
	{/if}
</section>

<!-- Insight penting -->
{#if topInsights.length > 0}
	<section class="mt-4 space-y-2">
		<div class="flex items-center justify-between">
			<h2 class="text-sm font-bold">Insight penting</h2>
			<a href="/insights" class="text-xs font-semibold text-brand-600">Semua saran →</a>
		</div>
		{#each topInsights as ins (ins.id)}
			<a href="/insights" class="block rounded-2xl border border-gyellow-200 bg-gyellow-50 p-3.5 dark:border-gyellow-500/30 dark:bg-gyellow-500/10">
				<p class="flex items-center gap-1 text-[11px] font-bold tracking-wide text-gyellow-700 uppercase dark:text-gyellow-200">
					<AppIcon name="lightbulb" size={13} /> {ins.type.replace('_', ' ')}
				</p>
				<p class="mt-0.5 text-sm font-bold">{ins.title}</p>
				<p class="mt-0.5 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-300">{ins.description}</p>
			</a>
		{/each}
	</section>
{/if}

<!-- Transaksi terakhir -->
<section class="mt-4">
	<div class="mb-2 flex items-center justify-between">
		<h2 class="text-sm font-bold">Transaksi terakhir</h2>
		<a href="/expenses" class="text-xs font-semibold text-brand-600">Semua →</a>
	</div>
	{#if dash.recent.length === 0}
		<EmptyState
			title="Belum ada pengeluaran hari ini"
			subtitle="Catat transaksi pertama kamu."
		/>
		<a href="/expenses/new" class="mt-3 block rounded-xl bg-brand-600 py-3 text-center text-sm font-bold text-white">+ Catat Pengeluaran</a>
	{:else}
		<div class="space-y-2">
			{#each dash.recent as e (e.id)}
				<ExpenseRow expense={e} />
			{/each}
		</div>
	{/if}
</section>
