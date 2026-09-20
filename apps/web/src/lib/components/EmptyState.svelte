<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';

	let {
		icon = 'inbox',
		title,
		subtitle = '',
		action = null
	}: {
		icon?: string;
		title: string;
		subtitle?: string;
		action?: import('svelte').Snippet | null;
	} = $props();
</script>

<div class="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/60 px-4 py-8 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
	<div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-200/70 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
		<AppIcon name={icon} size={24} />
	</div>
	<p class="mt-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">{title}</p>
	{#if subtitle}<p class="mx-auto mt-1 max-w-60 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>{/if}
	{#if action}<div class="mt-4 flex justify-center">{@render action()}</div>{/if}
</div>
