<script lang="ts">
	import { formatIDR } from '$lib/utils/format';
	import { categoryById } from '$lib/api/mockClient';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import type { Expense } from '$lib/dummy/types';

	let { expense, showDate = true }: { expense: Expense; showDate?: boolean } = $props();
	const cat = $derived(categoryById(expense.category_id));
</script>

<a
	href={`/expenses/${expense.id}`}
	class="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-white p-3 transition hover:border-brand-200 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
>
	<span
		class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
		style="background:{cat?.color ?? '#888'}1a;color:{cat?.color ?? '#888'}"
	>
		<AppIcon name={cat?.icon ?? 'shapes'} size={20} />
	</span>
	<span class="min-w-0 flex-1">
		<span class="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{expense.description}</span>
		<span class="block truncate text-xs text-zinc-500 dark:text-zinc-400">
			{cat?.name ?? expense.category_id}{#if showDate} · {expense.transaction_date}{/if}{#if expense.payment_method} · {expense.payment_method}{/if}
		</span>
	</span>
	<span class="shrink-0 text-sm font-bold text-zinc-900 tabular-nums dark:text-zinc-50">
		{formatIDR(expense.amount)}
	</span>
</a>
