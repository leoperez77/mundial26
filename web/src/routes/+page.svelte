<script lang="ts">
	import { goto } from '$app/navigation';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import { album } from '$lib/stores/album.svelte';
	import * as m from '$lib/paraglide/messages.js';

	const HINTS = ['ARG-17', 'BRA-14', 'COL-19'];
	const KICKOFF = new Date('2026-06-11T20:00:00Z').getTime();

	let now = $state(Date.now());
	$effect(() => {
		const id = setInterval(() => (now = Date.now()), 1000 * 60);
		return () => clearInterval(id);
	});
	const days = $derived(Math.max(0, Math.floor((KICKOFF - now) / 86_400_000)));

	function hint(code: string) {
		void goto(`/s/${code}`);
	}
</script>

<svelte:head>
	<title>Mundial 26 — Find your sticker</title>
	<meta
		name="description"
		content="Find the album page for any Panini FIFA World Cup 2026 sticker."
	/>
</svelte:head>

<section class="pt-2">
	<div class="eyebrow">{m.home_eyebrow()}</div>
	<h1 class="font-display mt-3 text-[28px] leading-[0.92] tracking-tight break-words sm:text-[36px] md:text-[44px]">
		<span class="text-navy block">{m.home_headline_line1()}</span>
		<span class="text-gold-deep block">{m.home_headline_line2()}</span>
	</h1>
</section>

<section class="mt-6">
	<SearchBar autofocus />
	<div class="mt-4 flex flex-wrap items-center gap-2">
		<span class="font-mono text-muted text-[10px] font-bold tracking-widest uppercase"
			>{m.home_try_label()}</span
		>
		{#each HINTS as code (code)}
			<button
				type="button"
				class="font-mono bg-bg-alt text-navy hover:bg-border rounded-full px-3 py-1 text-[11px] font-bold tracking-wider uppercase transition-colors"
				onclick={() => hint(code)}
			>
				{code}
			</button>
		{/each}
	</div>
</section>

<section class="mt-6">
	<div class="bg-navy text-bg flex items-center justify-between overflow-hidden rounded-xl px-5 py-4">
		<div class="min-w-0">
			<div class="font-mono text-gold-light text-[10px] font-bold tracking-[0.18em] uppercase">
				{m.home_kickoff_label()}
			</div>
			<div class="font-display mt-1 text-lg leading-none tracking-wide">
				MEX &middot; USA &middot; CAN
			</div>
		</div>
		<div class="text-right">
			<div class="font-display text-gold text-4xl leading-none tabular-nums">{days}</div>
			<div class="font-mono text-bg/60 mt-1 text-[9px] font-bold tracking-widest uppercase">
				{m.home_days_to_go()}
			</div>
		</div>
	</div>
</section>

{#if album.error}
	<p class="text-red mt-6 text-sm">{m.home_load_error()} {album.error}</p>
{:else if album.loading && !album.data}
	<p class="text-muted mt-6 text-xs">{m.home_loading()}</p>
{/if}
