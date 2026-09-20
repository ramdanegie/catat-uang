<script lang="ts">
	import { goto } from '$app/navigation';
	import { ApiError } from '$lib/api/client';
	import ExpenseForm from '$lib/components/ExpenseForm.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { addExpense } from '$lib/dummy/store';

	let formError = $state('');

	function save(v: { amount: number; description: string; category_id: string; transaction_date: string; note: string; payment_method: string }) {
		formError = '';
		addExpense({ ...v, note: v.note || undefined })
			.then(() => goto('/dashboard'))
			.catch((err) => {
				formError = err instanceof ApiError ? err.message : 'Gagal menyimpan. Periksa koneksi lalu coba lagi.';
			});
	}
</script>

<PageHeader title="Catat Pengeluaran" subtitle="Input cepat — beberapa detik saja" />
<ExpenseForm onSubmit={save} error={formError} />
