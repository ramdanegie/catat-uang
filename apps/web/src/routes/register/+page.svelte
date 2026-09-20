<script lang="ts">
	import { goto } from '$app/navigation';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import AuthArt from '$lib/components/AuthArt.svelte';
	import GoogleIcon from '$lib/components/GoogleIcon.svelte';
	import { ApiError, apiBase, apiMode } from '$lib/api/client';
	import { dummyRegister } from '$lib/dummy/store';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let error = $state('');
	let busy = $state(false);

	async function submit(e: Event) {
		e.preventDefault();
		if (name.trim().length < 2) {
			error = 'Nama minimal 2 karakter.';
			return;
		}
		if (!email.includes('@')) {
			error = 'Email tidak valid.';
			return;
		}
		if (password.length < 4) {
			error = 'Password minimal 4 karakter.';
			return;
		}
		error = '';
		busy = true;
		try {
			await dummyRegister(name.trim(), email.trim(), password);
			goto('/dashboard');
		} catch (err) {
			error = err instanceof ApiError ? err.message : 'Gagal mendaftar. Coba lagi.';
		} finally {
			busy = false;
		}
	}
</script>

<div class="flex min-h-dvh bg-zinc-50 dark:bg-zinc-950">
	<!-- Kolom form -->
	<div class="flex w-full flex-1 items-center justify-center px-6 py-10">
		<div class="w-full max-w-md">
			<div class="mb-6 flex items-center gap-3">
				<span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white"><AppIcon name="wallet" size={26} /></span>
				<div>
					<h1 class="text-xl font-extrabold text-zinc-900 dark:text-zinc-50">Buat akun</h1>
					<p class="text-xs text-zinc-500">Mulai catat pengeluaran dalam hitungan detik</p>
				</div>
			</div>

			<form onsubmit={submit} class="space-y-3 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
				<label class="block">
					<span class="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">Nama</span>
					<input bind:value={name} required placeholder="Nama kamu" autocomplete="name" class="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none focus:border-brand-400 dark:border-zinc-700 dark:bg-zinc-800" />
				</label>
				<label class="block">
					<span class="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">Email</span>
					<input type="email" bind:value={email} required placeholder="kamu@email.com" autocomplete="email" class="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none focus:border-brand-400 dark:border-zinc-700 dark:bg-zinc-800" />
				</label>
				<label class="block">
					<span class="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">Password</span>
					<input type="password" bind:value={password} required placeholder="Minimal 4 karakter" autocomplete="new-password" class="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none focus:border-brand-400 dark:border-zinc-700 dark:bg-zinc-800" />
				</label>
				{#if error}<p class="rounded-xl bg-gred-50 px-3 py-2 text-xs text-gred-600 dark:bg-gred-500/15 dark:text-gred-200">{error}</p>{/if}
				<button type="submit" disabled={busy} class="w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60">
					{busy ? 'Memproses…' : 'Daftar'}
				</button>
				{#if apiMode}
					<div class="flex items-center gap-2 text-[11px] text-zinc-400">
						<span class="h-px flex-1 bg-zinc-200 dark:bg-zinc-700"></span>atau<span class="h-px flex-1 bg-zinc-200 dark:bg-zinc-700"></span>
					</div>
					<a
						href={`${apiBase}/api/v1/auth/google/start`}
						class="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
					>
						<GoogleIcon size={18} /> Daftar dengan Google
					</a>
				{/if}
				<p class="pt-1 text-center text-xs text-zinc-500">
					Sudah punya akun? <a href="/login" class="font-semibold text-brand-600">Masuk</a>
				</p>
			</form>
		</div>
	</div>

	<!-- Panel ilustrasi desktop -->
	<aside class="hidden w-[46%] shrink-0 items-center justify-center p-8 lg:flex xl:w-[52%]">
		<div class="w-full max-w-lg">
			<AuthArt class="h-auto w-full drop-shadow-xl" />
			<h2 class="mt-6 text-center text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
				Mulai perjalanan hematmu.
			</h2>
			<p class="mx-auto mt-2 max-w-md text-center text-sm text-zinc-500 dark:text-zinc-400">
				Daftar gratis — tanpa kartu kredit. Datamu milikmu, tersimpan aman di akunmu.
			</p>
			<div class="mt-5 flex items-center justify-center gap-5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
				<span class="flex items-center gap-1.5"><AppIcon name="circle-check" size={15} /> Gratis selamanya</span>
				<span class="flex items-center gap-1.5"><AppIcon name="circle-check" size={15} /> Ekspor CSV</span>
				<span class="flex items-center gap-1.5"><AppIcon name="circle-check" size={15} /> Login Google</span>
			</div>
		</div>
	</aside>
</div>
