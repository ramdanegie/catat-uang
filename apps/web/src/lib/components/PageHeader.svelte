<script lang="ts">
	let { title, subtitle = '', right = null }: { title: string; subtitle?: string; right?: import('svelte').Snippet | null } =
		$props();
</script>

<div class="mb-4 flex items-start justify-between gap-3">
	<div>
		<h1 class="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h1>
		{#if subtitle}<p class="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>{/if}
	</div>
	{#if right}{@render right()}{/if}
</div>
