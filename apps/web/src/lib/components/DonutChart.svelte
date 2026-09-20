<script lang="ts">
	let {
		segments
	}: {
		segments: { label: string; value: number; color: string }[];
	} = $props();

	const total = $derived(segments.reduce((a, s) => a + s.value, 0));
	const R = 54;
	const C = 2 * Math.PI * R;

	let acc = 0;
	const arcs = $derived(
		segments.map((s) => {
			const frac = total > 0 ? s.value / total : 0;
			const start = acc;
			acc += frac;
			return { ...s, frac, dash: frac * C, offset: -start * C };
		})
	);
</script>

<div class="flex items-center gap-4">
	<svg viewBox="0 0 140 140" class="h-32 w-32 shrink-0 -rotate-90">
		<circle cx="70" cy="70" r={R} fill="none" stroke-width="22" class="stroke-zinc-100 dark:stroke-zinc-800" />
		{#each arcs as a (a.label)}
			<circle
				cx="70"
				cy="70"
				r={R}
				fill="none"
				stroke={a.color}
				stroke-width="22"
				stroke-dasharray={`${a.dash} ${C - a.dash}`}
				stroke-dashoffset={a.offset}
				stroke-linecap="butt"
			/>
		{/each}
	</svg>
	<ul class="min-w-0 flex-1 space-y-1.5">
		{#each segments.slice(0, 6) as s (s.label)}
			<li class="flex items-center gap-2 text-xs">
				<span class="h-2.5 w-2.5 shrink-0 rounded-full" style="background:{s.color}"></span>
				<span class="min-w-0 flex-1 truncate text-zinc-600 dark:text-zinc-300">{s.label}</span>
				<span class="font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">
					{total ? ((s.value / total) * 100).toFixed(0) : 0}%
				</span>
			</li>
		{/each}
	</ul>
</div>
