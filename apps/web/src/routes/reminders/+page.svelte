<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { expenses, reminders, todayStr } from '$lib/dummy/store';
	import { categoryById } from '$lib/api/mockClient';
	import { weeklySummary } from '$lib/utils/analytics';
	import { formatDateID, formatIDR, formatPct, pctChange } from '$lib/utils/format';

	const summary = $derived(weeklySummary($expenses, todayStr));
	const deltaPct = $derived(pctChange(summary.total, summary.prevTotal));
	const topCat = $derived(summary.top ? categoryById(summary.top.category_id) : undefined);

	let testMsg = $state('');

	function sendTest() {
		testMsg = $reminders.daily_enabled
			? `Notifikasi dummy terkirim: “Sudah mencatat pengeluaran hari ini?” (${$reminders.daily_time})`
			: 'Aktifkan pengingat harian dulu untuk test.';
		setTimeout(() => (testMsg = ''), 4000);
	}
</script>

<PageHeader title="Pengingat & Rutinitas" subtitle="Bentuk kebiasaan pencatatan" />

<section class="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
	<h2 class="flex items-center gap-2 text-sm font-bold"><AppIcon name="bell-ring" size={17} /> Pengingat catat harian</h2>
	<label class="mt-3 flex items-center justify-between text-sm">
		<span>Aktifkan pengingat</span>
		<input type="checkbox" bind:checked={$reminders.daily_enabled} class="h-5 w-5 accent-brand-600" />
	</label>
	<label class="mt-2 flex items-center justify-between gap-3 text-sm">
		<span>Jam pengingat</span>
		<input type="time" bind:value={$reminders.daily_time} class="rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
	</label>
	<div class="mt-3 rounded-2xl bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
		Default: <b>20:00 WIB</b> — “Sudah mencatat pengeluaran hari ini?” (PRD §5.7A)
	</div>
	<button onclick={sendTest} class="mt-3 w-full rounded-xl border border-zinc-200 py-2.5 text-xs font-bold dark:border-zinc-700">Kirim notifikasi test (dummy)</button>
	{#if testMsg}<p class="mt-2 rounded-xl bg-ggreen-50 p-2.5 text-xs text-ggreen-700 dark:bg-ggreen-500/15 dark:text-ggreen-200">{testMsg}</p>{/if}
</section>

<section class="mt-3 rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
	<h2 class="flex items-center gap-2 text-sm font-bold"><AppIcon name="calendar-days" size={17} /> Ringkasan mingguan</h2>
	<label class="mt-3 flex items-center justify-between text-sm">
		<span>Aktifkan ringkasan</span>
		<input type="checkbox" bind:checked={$reminders.weekly_enabled} class="h-5 w-5 accent-brand-600" />
	</label>
	<div class="mt-2 grid grid-cols-2 gap-2 text-sm">
		<label class="block text-xs">Hari
			<select bind:value={$reminders.weekly_day} class="mt-1 w-full rounded-xl border border-zinc-200 px-2 py-2 dark:border-zinc-700 dark:bg-zinc-800">
				{#each ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'] as d (d)}<option>{d}</option>{/each}
			</select>
		</label>
		<label class="block text-xs">Jam
			<input type="time" bind:value={$reminders.weekly_time} class="mt-1 w-full rounded-xl border border-zinc-200 px-2 py-2 dark:border-zinc-700 dark:bg-zinc-800" />
		</label>
	</div>
</section>

<section class="mt-3 rounded-3xl bg-gradient-to-br from-brand-50 to-brand-100 p-5 text-zinc-900 dark:from-brand-500/25 dark:to-brand-500/10 dark:text-white">
	<p class="text-xs opacity-70">7 hari terakhir · {formatDateID(summary.start)} – {formatDateID(summary.end)}</p>
	<p class="mt-1 text-2xl font-extrabold tabular-nums">{formatIDR(summary.total)}</p>
	<p class="mt-1 text-xs opacity-70">
		{summary.count} transaksi · terbesar: {topCat?.name ?? '—'}
		{#if summary.prevTotal > 0}· {formatPct(deltaPct)} vs minggu lalu{/if}
	</p>
</section>
