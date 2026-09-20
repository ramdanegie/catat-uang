<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { ApiError } from '$lib/api/client';
	import ExpenseForm from '$lib/components/ExpenseForm.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { expenses, updateExpense } from '$lib/dummy/store';

	const id = $derived(page.params.id);
	const expense = $derived($expenses.find((e) => e.id === id));
	let formError = $state('');

	function save(v: { amount: number; description: string; category_id: string; transaction_date: string; note: string; payment_method: string }) {
		if (!expense) return;
		formError = '';
		updateExpense(expense.id, { ...v, note: v.note || undefined })
			.then(() => goto(`/expenses/${expense.id}`))
			.catch((err) => {
				formError = err instanceof ApiError ? err.message : 'Gagal menyimpan perubahan. Coba lagi.';
			});
	}
</script>

{#if !expense}
	<PageHeader title="Tidak ditemukan" subtitle="Transaksi mungkin sudah dihapus." />
{:else}
	<PageHeader title="Ubah Catatan" subtitle={expense.description} />
	<ExpenseForm
		initial={{
			amount: expense.amount,
			description: expense.description,
			category_id: expense.category_id,
			transaction_date: expense.transaction_date,
			note: expense.note ?? '',
			payment_method: expense.payment_method ?? 'Tunai'
		}}
		submitLabel="SIMPAN PERUBAHAN"
		onSubmit={save}
		error={formError}
	/>
{/if}
