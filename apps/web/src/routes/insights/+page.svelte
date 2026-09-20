<script lang="ts">
	import { budgetItems, budgets, categories, expenses, monthStr } from '$lib/dummy/store';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { generateInsights } from '$lib/utils/analytics';
	import { formatMonthID } from '$lib/utils/format';

	let month = $state(monthStr);
	const budget = $derived($budgets.find((b) => b.month === month));
	const insights = $derived(generateInsights($expenses, $categories, month, budget, $budgetItems));

	const typeIcon: Record<string, string> = {
		top_category: 'award',
		category_spike: 'trending-up',
		frequent_small: 'coffee',
		budget_warning: 'triangle-alert',
		budget_exceeded: 'circle-alert'
	};
</script>

<PageHeader title="Saran Hemat" subtitle="Rule-based dari data transaksimu · bukan AI generatif" />

<div class="flex gap-2 rounded-2xl border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
	<label class="flex flex-1 items-center gap-2 text-xs">Bulan
		<input type="month" bind:value={month} class="w-full rounded-lg border border-zinc-200 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-800" />
	</label>
</div>

<div class="mt-3 space-y-2.5">
	{#if insights.length === 0}
		<EmptyState title="Belum ada insight" subtitle="Butuh minimal 1 transaksi di bulan ini untuk menghasilkan saran." />
	{:else}
		{#each insights as ins (ins.id)}
			<article class="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
				<div class="flex items-start gap-2.5">
					<span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gyellow-100 text-gyellow-700 dark:bg-gyellow-500/15 dark:text-gyellow-200">
						<AppIcon name={typeIcon[ins.type] ?? 'lightbulb'} size={20} />
					</span>
					<div class="min-w-0 flex-1">
						<p class="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">{ins.type.replace(/_/g, ' ')} · prioritas {ins.priority}</p>
						<h2 class="text-sm font-bold">{ins.title}</h2>
						<p class="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">{ins.description}</p>
						<details class="mt-2 rounded-xl bg-zinc-50 p-2.5 text-[11px] dark:bg-zinc-800">
							<summary class="cursor-pointer font-semibold text-zinc-600 dark:text-zinc-300">Lihat evidence angka</summary>
							<pre class="mt-1.5 overflow-x-auto font-mono text-[11px] text-zinc-600 dark:text-zinc-300">{JSON.stringify(ins.evidence, null, 2)}</pre>
						</details>
					</div>
				</div>
			</article>
		{/each}
		<p class="rounded-2xl bg-brand-50 p-3 text-[11px] text-brand-800 dark:bg-brand-500/15 dark:text-brand-300">
			Rule deterministik (PRD §5.6): input sama → hasil sama. Setiap insight bisa ditelusuri ke evidence di atas.
		</p>
	{/if}
</div>
