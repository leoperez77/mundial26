<script lang="ts">
	import { onMount } from 'svelte';
	import { loadAlbumData } from '$lib/data';
	import type { AlbumData } from '$lib/types';

	let album = $state<AlbumData | null>(null);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			album = await loadAlbumData();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
	});
</script>

<svelte:head>
	<title>Mundial 26</title>
</svelte:head>

<main class="mx-auto max-w-2xl p-8">
	<div class="eyebrow">Phase 3 / Data loader online</div>
	<h1 class="font-display mt-2 text-5xl leading-none">Mundial 26</h1>
	<p class="text-muted mt-2 text-sm">
		Real home page lands in Phase 4. Below confirms the album JSON loads + caches.
	</p>

	<section class="bg-surface border-border mt-6 rounded-lg border p-4">
		{#if error}
			<p class="text-red">Error: {error}</p>
		{:else if !album}
			<p class="text-muted">Loading…</p>
		{:else}
			<dl class="font-mono grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
				<dt class="text-muted">album</dt>
				<dd>{album.album}</dd>
				<dt class="text-muted">generated_at</dt>
				<dd>{album.generated_at}</dd>
				<dt class="text-muted">countries</dt>
				<dd>{album.countries.length}</dd>
				<dt class="text-muted">stickers</dt>
				<dd>
					{album.countries.reduce((n, c) => n + c.stickers.length, 0)}
				</dd>
				<dt class="text-muted">pages filled</dt>
				<dd>{album.countries.filter((c) => c.page !== null).length}</dd>
				<dt class="text-muted">groups assigned</dt>
				<dd>{album.countries.filter((c) => c.group !== null).length}</dd>
			</dl>

			<p class="text-muted mt-4 text-xs">
				Open DevTools → Application → IndexedDB → <span class="font-mono">keyval-store</span>
				to see the cached entry under <span class="font-mono">mundial26:album</span>.
			</p>
		{/if}
	</section>
</main>
