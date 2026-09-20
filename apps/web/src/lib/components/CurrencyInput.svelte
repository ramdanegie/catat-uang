<script lang="ts">
	// Currency input IDR: user mengetik angka polos, tampil otomatis
	// terformat ribuan ala Indonesia (cth. 125000 -> "125.000").
	// Nilai mentah (number) tetap di-bind ke `value`.
	let {
		value = $bindable(0),
		id = 'currency',
		placeholder = '0',
		inputClass = 'text-3xl',
		autofocus = false
	}: {
		value?: number;
		id?: string;
		placeholder?: string;
		inputClass?: string;
		autofocus?: boolean;
	} = $props();

	let el: HTMLInputElement | null = $state(null);

	function fmt(n: number): string {
		return n > 0 ? n.toLocaleString('id-ID') : '';
	}

	// Sinkronkan perubahan dari luar (cth. tombol nominal cepat)
	// tanpa mengganggu kursor saat sedang mengetik.
	$effect(() => {
		const current = fmt(value);
		if (el && document.activeElement !== el && el.value !== current) {
			el.value = current;
		}
	});

	function onInput(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const digits = input.value
			.replace(/\D/g, '')
			.replace(/^0+(?=\d)/, '')
			.slice(0, 15);
		value = digits ? Number(digits) : 0;
		const formatted = fmt(value);
		if (input.value !== formatted) input.value = formatted;
	}
</script>

<div class="flex items-center gap-2">
	<span class="shrink-0 text-xl font-bold">Rp</span>
	<input
		bind:this={el}
		{id}
		type="text"
		inputmode="numeric"
		autocomplete="off"
		{placeholder}
		{autofocus}
		value={fmt(value)}
		oninput={onInput}
		class="w-full min-w-0 bg-transparent font-extrabold tabular-nums outline-none {inputClass}"
	/>
</div>
