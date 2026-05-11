<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Share2, Copy, Check, ArrowRight } from 'lucide-svelte';
	import { album } from '$lib/stores/album.svelte';
	import { flagEmoji } from '$lib/util/codes';

	const code = $derived(page.params.code?.toUpperCase() ?? '');
	const found = $derived(album.stickerByCode(code));

	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;

	async function share() {
		if (!found) return;
		const url = page.url.href;
		const title = `${found.sticker.name} (${found.country.name}) — page ${found.country.page ?? '?'}`;
		const text = `${found.sticker.code} · ${found.sticker.name} · ${found.country.name} · page ${found.country.page ?? '?'}`;
		if (typeof navigator !== 'undefined' && 'share' in navigator) {
			try {
				await navigator.share({ title, text, url });
				return;
			} catch {
				/* user cancelled — fall through to clipboard */
			}
		}
		try {
			await navigator.clipboard.writeText(`${text}\n${url}`);
			copied = true;
			clearTimeout(copyTimer);
			copyTimer = setTimeout(() => (copied = false), 2000);
		} catch {
			/* clipboard blocked — silent no-op */
		}
	}
</script>

<svelte:head>
	<title>{found ? `${found.sticker.code} — ${found.sticker.name} — Mundial 26` : 'Sticker — Mundial 26'}</title>
	{#if found}
		<meta
			name="description"
			content="{found.sticker.code} — {found.sticker.name} ({found.country.name}), album page {found.country.page ?? '?'}."
		/>
	{/if}
</svelte:head>

{#if !album.data}
	<p class="text-muted text-sm">Loading…</p>
{:else if !found}
	<div class="border-border rounded-xl border-2 border-dashed p-8 text-center">
		<p class="text-muted font-mono text-sm">
			No sticker with code <span class="font-bold">{code}</span>.
		</p>
		<button class="code-pill mt-4" onclick={() => goto('/')}>Try another</button>
	</div>
{:else}
	<!-- Broadcast hero -->
	<section class="bg-navy text-bg relative overflow-hidden rounded-2xl">
		<div class="accent-stripe h-1"></div>
		<div class="relative px-5 pt-5 pb-7">
			<div class="flex items-center justify-between">
				<a
					href="/c/{found.country.code}"
					class="flex items-center gap-2 text-sm hover:opacity-80"
					aria-label="Open {found.country.name}"
				>
					<span class="text-2xl leading-none" aria-hidden="true">
						{flagEmoji(found.country.code)}
					</span>
					<span class="min-w-0">
						<span class="font-mono text-gold-light block text-[10px] font-bold tracking-[0.18em] uppercase">
							{found.country.name}{found.country.group ? ` · Group ${found.country.group}` : ''}
						</span>
						<span class="text-bg/70 block text-xs">
							Sticker {found.sticker.number} of 20
						</span>
					</span>
				</a>
				<span class="code-pill">{found.sticker.code}</span>
			</div>

			<h1
				class="font-display mt-6 text-[44px] leading-[0.92] tracking-tight break-words"
				style:font-size={found.sticker.name.length > 18 ? '34px' : '44px'}
			>
				{found.sticker.name}
			</h1>

			<div class="bg-navy-deep mt-6 flex items-end justify-between rounded-xl px-4 py-5">
				<div>
					<div class="font-mono text-gold-light text-[10px] font-bold tracking-[0.18em] uppercase">
						Album page
					</div>
					<div class="font-display text-gold mt-1 text-[52px] leading-[0.85] tabular-nums">
						{found.country.page ?? '—'}
					</div>
				</div>
				<div class="font-mono text-bg/40 text-right text-[10px] tracking-widest uppercase">
					<div>Mundial 26</div>
					<div>{found.sticker.type.replace('_', ' ')}</div>
				</div>
			</div>

			<!-- Pitch corner arc -->
			<div
				aria-hidden="true"
				class="border-gold pointer-events-none absolute right-[-50px] bottom-[-50px] h-40 w-40 rounded-full border-2 opacity-10"
			></div>
		</div>
	</section>

	<div class="mt-4 flex gap-2">
		<button
			type="button"
			onclick={share}
			class="bg-navy text-bg hover:bg-navy-light flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors"
		>
			{#if copied}
				<Check size={16} aria-hidden="true" />
				<span>Copied</span>
			{:else}
				<Share2 size={16} aria-hidden="true" />
				<span>Share</span>
			{/if}
		</button>
		<a
			href="/c/{found.country.code}"
			class="bg-surface border-border hover:bg-bg-alt flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition-colors"
		>
			<span>All of {found.country.name}</span>
			<ArrowRight size={16} aria-hidden="true" />
		</a>
	</div>
{/if}
