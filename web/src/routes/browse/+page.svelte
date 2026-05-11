<script lang="ts">
	import { Search } from 'lucide-svelte';
	import { album } from '$lib/stores/album.svelte';
	import { flagEmoji } from '$lib/util/codes';

	let filter = $state('');

	const countries = $derived(
		(album.data?.countries ?? [])
			.slice()
			.sort((a, b) => a.code.localeCompare(b.code))
	);

	const filtered = $derived.by(() => {
		const q = filter.trim().toUpperCase();
		if (!q) return countries;
		return countries.filter(
			(c) => c.code.includes(q) || c.name.toUpperCase().includes(q) || (c.group ?? '') === q
		);
	});
</script>

<svelte:head>
	<title>Browse — Mundial 26</title>
</svelte:head>

<section>
	<div class="eyebrow">Browse</div>
	<h1 class="font-display mt-2 text-[32px] leading-[0.95]">All 48 teams</h1>
</section>

<div
	class="bg-surface border-border focus-within:border-navy mt-4 flex items-center gap-3 rounded-xl border-2 px-4 py-2.5 transition-colors"
>
	<Search size={18} class="text-muted shrink-0" aria-hidden="true" />
	<input
		bind:value={filter}
		type="search"
		inputmode="search"
		autocomplete="off"
		spellcheck="false"
		placeholder="Filter by name, code, or group"
		aria-label="Filter countries"
		class="font-mono placeholder:text-muted-light flex-1 bg-transparent text-sm outline-none"
	/>
	{#if filter}
		<button class="text-muted hover:text-text text-xs" onclick={() => (filter = '')}>Clear</button>
	{/if}
</div>

{#if !album.data}
	<p class="text-muted mt-4 text-sm">Loading…</p>
{:else}
	<p class="text-muted mt-3 text-xs">
		{filtered.length} of {countries.length}
	</p>
	<ul class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
		{#each filtered as c (c.code)}
			<li>
				<a
					href="/c/{c.code}"
					class="bg-surface border-border hover:border-navy relative block rounded-xl border p-3 transition-colors"
				>
					{#if c.group}
						<span
							class="font-mono bg-gold-deep text-bg absolute top-2 right-2 rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest"
						>
							{c.group}
						</span>
					{/if}
					<div class="text-3xl leading-none" aria-hidden="true">{flagEmoji(c.code)}</div>
					<div class="font-display mt-3 text-lg leading-none">{c.code}</div>
					<div class="text-muted mt-1 truncate text-[11px]">{c.name}</div>
					<div class="font-mono text-gold-deep mt-2 text-[9px] tracking-widest uppercase">
						Page {c.page ?? '—'}
					</div>
				</a>
			</li>
		{/each}
	</ul>
{/if}
