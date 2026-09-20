<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { api, setToken } from '$lib/api/client';
	import { applyMeUser, syncFromBackend } from '$lib/dummy/store';

	let failed = $state(false);
	let message = $state('Menghubungkan akun Google…');

	onMount(async () => {
		// Token dikirim via URL fragment (#token=…) agar tidak masuk server log.
		const hash = new URLSearchParams(window.location.hash.slice(1));
		const err = hash.get('error');
		if (err) {
			failed = true;
			message = err;
			return;
		}
		const token = hash.get('token');
		if (!token) {
			failed = true;
			message = 'Token tidak ditemukan. Silakan coba lagi.';
			return;
		}
		window.location.hash = '';
		setToken(token);
		try {
			const me = await api<{ user: { id: string; name: string; email: string; currency: string; timezone: string; avatar_url?: string | null } }>(
				'/api/v1/auth/me'
			);
			applyMeUser(me.user);
			await syncFromBackend();
			goto('/dashboard');
		} catch {
			failed = true;
			message = 'Gagal memverifikasi sesi Google. Silakan coba lagi.';
			setToken(null);
		}
	});
</script>

<div class="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 py-10 text-center">
	{#if !failed}
		<span class="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-brand-600 dark:border-zinc-700"></span>
		<PageHeader title="Menghubungkan…" subtitle={message} />
	{:else}
		<PageHeader title="Login Google gagal" subtitle={message} />
		<a href="/login" class="mt-2 w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white">Kembali ke Masuk</a>
	{/if}
</div>
