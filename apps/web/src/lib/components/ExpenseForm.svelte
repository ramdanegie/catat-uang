<script lang="ts">
	import { categories } from '$lib/dummy/store';
	import { PAYMENT_METHODS } from '$lib/dummy/seed';
	import { todayStr } from '$lib/dummy/store';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import CurrencyInput from '$lib/components/CurrencyInput.svelte';

	let {
		initial = { amount: 0, description: '', category_id: '', transaction_date: todayStr, note: '', payment_method: 'Tunai' },
		submitLabel = 'SIMPAN PENGELUARAN',
		onSubmit,
		error = ''
	}: {
		initial?: { amount: number; description: string; category_id: string; transaction_date: string; note: string; payment_method: string };
		submitLabel?: string;
		onSubmit: (v: { amount: number; description: string; category_id: string; transaction_date: string; note: string; payment_method: string }) => void;
		error?: string;
	} = $props();

	let amount = $state(initial.amount);
	let description = $state(initial.description);
	let category_id = $state(initial.category_id || $categories.find((c) => c.is_active)?.id || '');
	let transaction_date = $state(initial.transaction_date);
	let note = $state(initial.note);
	let payment_method = $state(initial.payment_method);
	let localError = $state('');

	function submit(e: Event) {
		e.preventDefault();
		if (!amount || amount <= 0) {
			localError = 'Nominal harus lebih dari 0.';
			return;
		}
		if (!category_id) {
			localError = 'Kategori wajib dipilih.';
			return;
		}
		if (!description.trim()) {
			localError = 'Keterangan wajib diisi.';
			return;
		}
		if (!transaction_date) {
			localError = 'Tanggal tidak valid.';
			return;
		}
		localError = '';
		onSubmit({ amount, description: description.trim(), category_id, transaction_date, note: note.trim(), payment_method });
	}
</script>

<form onsubmit={submit} class="space-y-4">
	<div class="rounded-3xl bg-gradient-to-br from-brand-50 to-brand-100 p-5 text-zinc-900 dark:from-brand-500/25 dark:to-brand-500/10 dark:text-white">
		<label class="text-xs opacity-70" for="expense-amount">Nominal pengeluaran</label>
		<div class="mt-1">
			<CurrencyInput id="expense-amount" bind:value={amount} placeholder="0" inputClass="text-3xl placeholder:text-zinc-400 dark:placeholder:text-white/40" />
		</div>
		<div class="mt-3 flex flex-wrap gap-2">
			{#each [15000, 25000, 50000, 100000] as q (q)}
				<button type="button" onclick={() => (amount = q)} class="rounded-full bg-brand-600/10 px-3 py-1 text-xs font-semibold text-brand-800 tabular-nums hover:bg-brand-600/15 dark:bg-white/15 dark:text-white dark:hover:bg-white/25">
					{q.toLocaleString('id-ID')}
				</button>
			{/each}
		</div>
	</div>

	<label class="block">
		<span class="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Keterangan</span>
		<input
			bind:value={description}
			placeholder="cth: Makan siang"
			class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none focus:border-brand-400 dark:border-zinc-700 dark:bg-zinc-900"
		/>
	</label>

	<div>
		<span class="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Kategori</span>
		<div class="grid grid-cols-3 gap-2">
			{#each $categories.filter((c) => c.is_active) as c (c.id)}
				<button
					type="button"
					onclick={() => (category_id = c.id)}
					class="flex flex-col items-center gap-1 rounded-2xl border px-2 py-2.5 text-xs font-medium transition {category_id === c.id
						? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
						: 'border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'}"
				>
					<span style="color:{c.color}"><AppIcon name={c.icon} size={20} /></span>
					<span class="line-clamp-1">{c.name.split(' ')[0]}</span>
				</button>
			{/each}
		</div>
	</div>

	<div class="grid grid-cols-2 gap-3">
		<label class="block">
			<span class="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Tanggal</span>
			<input
				type="date"
				bind:value={transaction_date}
				class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none focus:border-brand-400 dark:border-zinc-700 dark:bg-zinc-900"
			/>
		</label>
		<label class="block">
			<span class="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Metode bayar</span>
			<select bind:value={payment_method} class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900">
				{#each PAYMENT_METHODS as m (m)}<option value={m}>{m}</option>{/each}
			</select>
		</label>
	</div>

	<label class="block">
		<span class="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Catatan tambahan (opsional)</span>
		<textarea
			bind:value={note}
			rows="2"
			placeholder="cth: makan bareng tim"
			class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-400 dark:border-zinc-700 dark:bg-zinc-900"
		></textarea>
	</label>

	{#if localError || error}
		<p class="rounded-xl bg-gred-50 px-3 py-2 text-xs text-gred-600 dark:bg-gred-500/15 dark:text-gred-200">{localError || error}</p>
	{/if}

	<button type="submit" class="sticky bottom-20 w-full rounded-2xl bg-brand-600 py-4 text-sm font-extrabold tracking-wide text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 md:bottom-6">
		{submitLabel}
	</button>
</form>
