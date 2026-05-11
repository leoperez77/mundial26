<script lang="ts">
	import { Heart, ExternalLink } from 'lucide-svelte';
	import { album } from '$lib/stores/album.svelte';
</script>

<svelte:head>
	<title>About — Mundial 26</title>
</svelte:head>

<section>
	<div class="eyebrow">About</div>
	<h1 class="font-display mt-2 text-[32px] leading-[0.95]">Mundial 26</h1>
	<p class="text-muted mt-3 text-sm leading-relaxed">
		A fast, offline-capable lookup tool for the Panini FIFA World Cup 2026™ sticker album. Type
		a code, find the page — without flipping to the back of the album.
	</p>
</section>

<section class="mt-6">
	<h2 class="font-mono text-text/70 text-[11px] font-bold tracking-widest uppercase">Data source</h2>
	<p class="text-muted mt-2 text-sm leading-relaxed">
		Sticker checklist sourced from the
		<a
			href="https://cartophilic-info-exch.blogspot.com/"
			class="text-navy hover:text-navy-light inline-flex items-center gap-1 underline"
			target="_blank"
			rel="noopener"
		>
			Football Cartophilic Info Exchange<ExternalLink size={12} aria-hidden="true" />
		</a>
		. Album page numbers + group letters keyed in from the physical album.
	</p>
	{#if album.data}
		<p class="font-mono text-muted-light mt-3 text-[11px]">
			Last data update: {album.data.generated_at}
		</p>
	{/if}
</section>

<!-- Tip jar placeholder (§6.7). TODO: wire up tip jar provider — see plan §10. -->
<section class="bg-surface border-border mt-8 rounded-xl border p-5">
	<div class="eyebrow"><Heart size={12} aria-hidden="true" /> Support</div>
	<h2 class="font-display mt-2 text-xl leading-tight">Support this project</h2>
	<p class="text-muted mt-2 text-xs leading-relaxed">
		One developer, one album, one weekend. If this saved you some flips, you'll be able to drop a
		tip here soon.
	</p>
	<button
		type="button"
		disabled
		class="bg-bg-alt text-muted mt-3 inline-flex cursor-not-allowed items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold tracking-wider uppercase"
	>
		Coming soon
	</button>
</section>

<section class="mt-8">
	<h2 class="font-mono text-text/70 text-[11px] font-bold tracking-widest uppercase">Disclaimer</h2>
	<p class="text-muted mt-2 text-xs leading-relaxed">
		This site is not affiliated with, endorsed by, or sponsored by Panini, FIFA, or any
		participating football association. "FIFA World Cup 2026™" and team names are trademarks of
		their respective owners.
	</p>
</section>

<footer class="text-muted-light mt-10 text-center text-[10px]">
	mundial26.co · v0.1 · made with care
</footer>
