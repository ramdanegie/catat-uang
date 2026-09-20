<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { authUser } from '$lib/dummy/store';

	$effect(() => {
		if (!browser) return;
		goto($authUser ? '/dashboard' : '/login');
	});
</script>

<div class="flex min-h-dvh items-center justify-center">
	<p class="text-sm text-zinc-500">Mengalihkan…</p>
</div>
