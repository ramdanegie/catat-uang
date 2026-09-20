<script lang="ts">
	let {
		data,
		height = 140
	}: { data: { label: string; value: number }[]; height?: number } = $props();

	const max = $derived(Math.max(1, ...data.map((d) => d.value)));
	const barW = $derived(data.length ? 100 / data.length : 100);
</script>

<div class="flex items-end gap-1" style="height:{height}px">
	{#each data as d, i (i)}
		<div class="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${d.label}: ${d.value}`}>
			<div
				class="w-full max-w-7 rounded-t-md transition {d.value > 0 ? 'bg-brand-600/90' : 'bg-zinc-200 dark:bg-zinc-800'}"
				style="height:{d.value > 0 ? Math.max(4, (d.value / max) * 100) : 4}%"
			></div>
			{#if data.length <= 12 || i % Math.ceil(data.length / 8) === 0}
				<span class="text-[9px] text-zinc-400">{d.label}</span>
			{/if}
		</div>
	{/each}
</div>
<p class="sr-only">max bar width {barW}%</p>
