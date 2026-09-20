<script lang="ts">
	let {
		value,
		max,
		barClass = 'bg-brand-600',
		height = 'h-2.5'
	}: { value: number; max: number; barClass?: string; height?: string } = $props();

	const pct = $derived(max > 0 ? Math.min(100, (value / max) * 100) : 0);
</script>

<div class="w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800 {height}">
	<div class="h-full rounded-full transition-all {barClass}" style="width:{pct}%"></div>
</div>
