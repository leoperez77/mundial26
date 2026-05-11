<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import BrandHeader from '$lib/components/BrandHeader.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import { album } from '$lib/stores/album.svelte';
	import { locale } from '$lib/stores/locale.svelte';

	let { children } = $props();

	onMount(() => {
		void album.load();
		void registerPwa();
	});

	async function registerPwa() {
		if (!import.meta.env.PROD) return;
		try {
			const { registerSW } = await import('virtual:pwa-register');
			registerSW({ immediate: true });
		} catch {
			/* Module missing in dev — ignore. */
		}
	}

	$effect(() => {
		if (typeof document !== 'undefined') {
			document.documentElement.lang = locale.current;
		}
	});
</script>

<div class="bg-bg text-text min-h-screen pb-24">
	<BrandHeader />
	<main class="mx-auto max-w-3xl px-4 py-6">
		{@render children()}
	</main>
	<BottomNav />
</div>
