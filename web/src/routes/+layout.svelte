<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import BrandHeader from '$lib/components/BrandHeader.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import { album } from '$lib/stores/album.svelte';

	let { children } = $props();

	onMount(() => {
		void album.load();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="bg-bg text-text min-h-screen pb-24">
	<BrandHeader />
	<main class="mx-auto max-w-3xl px-4 py-6">
		{@render children()}
	</main>
	<BottomNav />
</div>
