<script lang="ts">
	import { goto } from '$app/navigation';
	import Fuse, { type FuseResult, type IFuseOptions } from 'fuse.js';
	import { Search, ArrowRight } from 'lucide-svelte';
	import { album } from '$lib/stores/album.svelte';
	import { parseInput, flagEmoji } from '$lib/util/codes';
	import * as m from '$lib/paraglide/messages.js';

	let { autofocus = false } = $props<{ autofocus?: boolean }>();

	let mode = $state<'single' | 'pair'>('single');
	let pairCountry = $state('');
	let pairNumber = $state('');

	const countries = $derived(album.data?.countries.slice().sort((a, b) => a.code.localeCompare(b.code)) ?? []);

	function submitPair() {
		const c = pairCountry.toUpperCase();
		const n = Number(pairNumber);
		if (!c || !Number.isFinite(n) || n < 1 || n > 20) return;
		void goto(`/s/${c}-${n}`);
	}

	type Item =
		| { kind: 'country'; code: string; name: string }
		| {
				kind: 'sticker';
				code: string; // e.g. "ARG-10"
				country: string; // "ARG"
				countryName: string;
				name: string; // player or "Team Photo"/"Emblem"
				number: number;
		  };

	const FUSE_OPTS: IFuseOptions<Item> = {
		keys: [
			{ name: 'name', weight: 0.6 },
			{ name: 'countryName', weight: 0.3 },
			{ name: 'code', weight: 0.1 }
		],
		threshold: 0.35,
		ignoreLocation: true,
		minMatchCharLength: 2
	};

	const items: Item[] = $derived.by(() => {
		const data = album.data;
		if (!data) return [];
		const out: Item[] = [];
		for (const c of data.countries) {
			out.push({ kind: 'country', code: c.code, name: c.name });
			for (const s of c.stickers) {
				if (s.type === 'player') {
					out.push({
						kind: 'sticker',
						code: s.code,
						country: c.code,
						countryName: c.name,
						name: s.name,
						number: s.number
					});
				}
			}
		}
		return out;
	});

	const fuse = $derived(new Fuse(items, FUSE_OPTS));

	let query = $state('');
	let debounced = $state('');
	let timer: ReturnType<typeof setTimeout> | undefined;
	let highlight = $state(0);
	let input: HTMLInputElement | undefined = $state();

	$effect(() => {
		const value = query;
		clearTimeout(timer);
		timer = setTimeout(() => (debounced = value), 150);
		return () => clearTimeout(timer);
	});

	$effect(() => {
		if (autofocus && input) input.focus();
	});

	const results: FuseResult<Item>[] = $derived.by(() => {
		const q = debounced.trim();
		if (q.length < 2) return [];
		const parsed = parseInput(q);

		// Exact sticker code (e.g. "COL-19"): surface the sticker if it exists,
		// otherwise fall back to the country card so the user has somewhere to go.
		if (parsed.kind === 'sticker') {
			const hit = album.stickerByCode(parsed.code);
			if (hit) {
				return [
					{
						item: {
							kind: 'sticker' as const,
							code: hit.sticker.code,
							country: hit.country.code,
							countryName: hit.country.name,
							name: hit.sticker.name,
							number: hit.sticker.number
						},
						refIndex: 0
					} satisfies FuseResult<Item>
				];
			}
			const country = album.countryByCode(parsed.country);
			if (country) {
				return [
					{
						item: { kind: 'country' as const, code: country.code, name: country.name },
						refIndex: 0
					} satisfies FuseResult<Item>
				];
			}
			return [];
		}

		// Exact country code (e.g. "COL"): surface that country.
		if (parsed.kind === 'country') {
			const country = album.countryByCode(parsed.code);
			if (country) {
				return [
					{
						item: { kind: 'country' as const, code: country.code, name: country.name },
						refIndex: 0
					} satisfies FuseResult<Item>
				];
			}
			return [];
		}

		// Fuzzy name match.
		return fuse.search(q).slice(0, 5);
	});

	const showDropdown = $derived(query.length > 0 && results.length > 0);

	$effect(() => {
		if (results.length === 0) highlight = 0;
		else if (highlight >= results.length) highlight = results.length - 1;
	});

	function navigate(item: Item) {
		query = '';
		debounced = '';
		if (item.kind === 'country') void goto(`/c/${item.code}`);
		else void goto(`/s/${item.code}`);
	}

	function submit() {
		const parsed = parseInput(query);
		// Exact-code parses always navigate, even before the album JSON has
		// loaded — the destination page handles its own "loading" / "not found"
		// state, and racing the album fetch here breaks Enter on slow networks.
		if (parsed.kind === 'sticker') {
			navigate({
				kind: 'sticker',
				code: parsed.code,
				country: parsed.country,
				countryName: '',
				name: '',
				number: parsed.number
			});
			return;
		}
		if (parsed.kind === 'country') {
			navigate({ kind: 'country', code: parsed.code, name: '' });
			return;
		}
		// Fuzzy: need results, which need album data.
		const r = results;
		if (r.length > 0) navigate(r[highlight].item);
	}

	function onKeyDown(e: KeyboardEvent) {
		const r = results;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (r.length > 0) highlight = (highlight + 1) % r.length;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (r.length > 0) highlight = (highlight - 1 + r.length) % r.length;
		} else if (e.key === 'Enter') {
			e.preventDefault();
			submit();
		} else if (e.key === 'Escape') {
			query = '';
			debounced = '';
			input?.blur();
		}
	}
</script>

<div class="relative">
	<!-- Mode toggle (§6.3) -->
	<div class="bg-bg-alt mb-3 inline-flex rounded-lg p-1 text-[11px] font-bold tracking-wider uppercase">
		<button
			type="button"
			class="rounded-md px-3 py-1.5 transition-colors"
			class:bg-navy={mode === 'single'}
			class:text-bg={mode === 'single'}
			class:text-muted={mode !== 'single'}
			onclick={() => (mode = 'single')}
		>
			{m.search_mode_single()}
		</button>
		<button
			type="button"
			class="rounded-md px-3 py-1.5 transition-colors"
			class:bg-navy={mode === 'pair'}
			class:text-bg={mode === 'pair'}
			class:text-muted={mode !== 'pair'}
			onclick={() => (mode = 'pair')}
		>
			{m.search_mode_pair()}
		</button>
	</div>

	{#if mode === 'pair'}
		<div class="bg-surface border-border focus-within:border-navy flex gap-2 rounded-xl border-2 p-2 transition-colors">
			<select
				bind:value={pairCountry}
				class="font-mono bg-transparent flex-1 min-w-0 px-2 py-2 text-base outline-none"
				aria-label={m.search_country_aria()}
			>
				<option value="" disabled>{m.search_country_placeholder()}</option>
				{#each countries as c (c.code)}
					<option value={c.code}>{flagEmoji(c.code)} {c.code} — {c.name}</option>
				{/each}
			</select>
			<input
				bind:value={pairNumber}
				type="number"
				inputmode="numeric"
				min="1"
				max="20"
				placeholder="№"
				aria-label={m.search_number_aria()}
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						submitPair();
					}
				}}
				class="font-mono placeholder:text-muted-light w-20 bg-transparent px-2 py-2 text-base outline-none tabular-nums"
			/>
			<button
				type="button"
				onclick={submitPair}
				disabled={!pairCountry || !pairNumber}
				class="bg-navy text-bg disabled:bg-bg-alt disabled:text-muted-light shrink-0 rounded-lg px-4 py-2 text-sm font-bold"
			>
				{m.search_go()}
			</button>
		</div>
	{:else}
	<div
		class="bg-surface border-border focus-within:border-navy flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition-colors"
	>
		<Search size={20} class="text-muted shrink-0" aria-hidden="true" />
		<input
			bind:this={input}
			bind:value={query}
			onkeydown={onKeyDown}
			type="search"
			inputmode="search"
			autocomplete="off"
			autocapitalize="characters"
			spellcheck="false"
			placeholder="RSA-14"
			aria-label={m.search_aria()}
			class="font-mono placeholder:text-muted-light flex-1 bg-transparent text-base outline-none uppercase"
		/>
		{#if query.length > 0}
			<button
				type="button"
				class="text-muted hover:text-text text-xs"
				onclick={() => {
					query = '';
					debounced = '';
					input?.focus();
				}}
			>
				{m.search_clear()}
			</button>
		{/if}
	</div>

	{#if showDropdown}
		<ul
			class="bg-surface border-border absolute inset-x-0 top-full z-20 mt-2 max-h-96 overflow-auto rounded-xl border shadow-lg"
		>
			{#each results as r, i (r.item.kind + ':' + r.item.code)}
				<li>
					<button
						type="button"
						class="hover:bg-bg-alt flex w-full items-center gap-3 px-4 py-3 text-left"
						class:bg-bg-alt={i === highlight}
						onmouseenter={() => (highlight = i)}
						onclick={() => navigate(r.item)}
					>
						<span class="text-2xl leading-none" aria-hidden="true">
							{flagEmoji(r.item.kind === 'country' ? r.item.code : r.item.country)}
						</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-sm font-medium">{r.item.name}</span>
							{#if r.item.kind === 'sticker'}
								<span class="text-muted block truncate text-xs">{r.item.countryName}</span>
							{:else}
								<span class="text-muted block truncate text-xs">{m.search_result_country()}</span>
							{/if}
						</span>
						<span class="code-pill shrink-0">{r.item.code}</span>
						<ArrowRight size={16} class="text-muted shrink-0" aria-hidden="true" />
					</button>
				</li>
			{/each}
		</ul>
	{/if}
	{/if}
</div>
