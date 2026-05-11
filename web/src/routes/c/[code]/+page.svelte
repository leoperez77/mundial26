<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Shield, Users, User } from 'lucide-svelte';
	import { album } from '$lib/stores/album.svelte';
	import { flagEmoji } from '$lib/util/codes';
	import * as m from '$lib/paraglide/messages.js';
	import type { StickerType } from '$lib/types';

	const code = $derived(page.params.code?.toUpperCase() ?? '');
	const country = $derived(album.countryByCode(code));

	let highlight = $state<number | null>(null);

	onMount(() => {
		// If we arrived here from /s/<COUNTRY>-N, highlight that sticker.
		const ref = document.referrer;
		const m = /\/s\/([A-Z]{3})-(\d{1,2})/i.exec(ref);
		if (m && m[1].toUpperCase() === code) {
			const n = Number(m[2]);
			highlight = n;
			queueMicrotask(() => {
				document.getElementById(`sticker-${n}`)?.scrollIntoView({ block: 'center' });
			});
		}
	});

	function iconFor(type: StickerType) {
		if (type === 'emblem') return Shield;
		if (type === 'team_photo') return Users;
		return User;
	}
</script>

<svelte:head>
	<title>{country ? `${country.name} — Mundial 26` : 'Country — Mundial 26'}</title>
</svelte:head>

{#if !album.data}
	<p class="text-muted text-sm">{m.common_loading()}</p>
{:else if !country}
	<div class="rounded-xl border-2 border-dashed border-border p-8 text-center">
		<p class="font-mono text-sm text-muted">
			{m.country_not_found()} <span class="font-bold">{code}</span>.
		</p>
		<button class="code-pill mt-4" onclick={() => goto('/browse')}>{m.country_browse_all()}</button>
	</div>
{:else}
	<!-- Hero card -->
	<section class="bg-navy text-bg overflow-hidden rounded-2xl">
		<div class="accent-stripe h-1"></div>
		<div class="relative px-5 py-6">
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0">
					<div class="font-mono text-gold-light text-[10px] font-bold tracking-[0.18em] uppercase">
						{m.country_eyebrow()}
					</div>
					<h1 class="font-display mt-1 text-4xl leading-[0.92]">
						{country.name}
					</h1>
					<div class="mt-2 flex items-center gap-2">
						<span class="code-pill">{country.code}</span>
						{#if country.group}
							<span class="font-mono bg-gold-deep text-bg rounded px-2 py-1 text-[10px] font-bold tracking-widest uppercase">
								{m.country_group_label({ letter: country.group })}
							</span>
						{/if}
					</div>
				</div>
				<div class="text-7xl leading-none" aria-hidden="true">{flagEmoji(country.code)}</div>
			</div>

			<div class="bg-navy-deep mt-5 rounded-xl px-4 py-4">
				<div class="font-mono text-gold-light text-[10px] font-bold tracking-[0.18em] uppercase">
					{m.country_album_page()}
				</div>
				<div class="font-display text-gold mt-1 text-5xl leading-none tabular-nums">
					{country.page ?? '—'}
				</div>
			</div>

			<!-- Pitch corner arc decoration (§7.6 motif 2) -->
			<div
				aria-hidden="true"
				class="border-gold pointer-events-none absolute right-[-40px] bottom-[-40px] h-32 w-32 rounded-full border-2 opacity-10"
			></div>
		</div>
	</section>

	<!-- Sticker list -->
	<section class="mt-6">
		<div class="eyebrow">{m.country_stickers_eyebrow()}</div>
		<ul class="bg-surface border-border mt-3 divide-y divide-[var(--color-border)] overflow-hidden rounded-xl border">
			{#each country.stickers as s (s.number)}
				{@const Icon = iconFor(s.type)}
				{@const isHi = highlight === s.number}
				<li
					id="sticker-{s.number}"
					class="flex items-center gap-3 px-4 py-3 transition-colors"
					class:bg-gold-light={isHi}
				>
					<Icon size={16} class="text-muted shrink-0" aria-hidden="true" />
					<span class="font-mono text-muted w-12 shrink-0 text-xs tabular-nums">#{s.number}</span>
					<a href="/s/{s.code}" class="min-w-0 flex-1">
						<span class="block truncate text-sm font-medium">{s.name}</span>
					</a>
					<span class="code-pill shrink-0">{s.code}</span>
				</li>
			{/each}
		</ul>
	</section>
{/if}
