<script lang="ts">
	import { Heart, ExternalLink } from 'lucide-svelte';
	import { album } from '$lib/stores/album.svelte';
	import { locale, SUPPORTED_LOCALES, type Locale } from '$lib/stores/locale.svelte';
	import * as m from '$lib/paraglide/messages.js';

	const LOCALE_LABELS: Record<Locale, string> = {
		es: 'Español',
		en: 'English',
		pt: 'Português'
	};
</script>

<svelte:head>
	<title>{m.about_eyebrow()} — Mundial 26</title>
</svelte:head>

<section>
	<div class="eyebrow">{m.about_eyebrow()}</div>
	<h1 class="font-display mt-2 text-[32px] leading-[0.95]">Mundial 26</h1>
	<p class="text-muted mt-3 text-sm leading-relaxed">
		{m.about_description()}
	</p>
</section>

<section class="mt-6">
	<h2 class="font-mono text-text/70 text-[11px] font-bold tracking-widest uppercase">
		{m.about_data_source_header()}
	</h2>
	<p class="text-muted mt-2 text-sm leading-relaxed">
		{m.about_data_source_text()}
		<a
			href="https://cartophilic-info-exch.blogspot.com/"
			class="text-navy hover:text-navy-light inline-flex items-center gap-1 underline"
			target="_blank"
			rel="noopener"
		>
			{m.about_data_source_link()}<ExternalLink size={12} aria-hidden="true" />
		</a>{m.about_data_source_text_after()}
	</p>
	{#if album.data}
		<p class="font-mono text-muted-light mt-3 text-[11px]">
			{m.about_last_update()} {album.data.generated_at}
		</p>
	{/if}
</section>

<!-- Language switcher (plan §6.5) -->
<section class="mt-6">
	<h2 class="font-mono text-text/70 text-[11px] font-bold tracking-widest uppercase">
		{m.about_language_label()}
	</h2>
	<div class="bg-bg-alt mt-2 inline-flex rounded-lg p-1 text-[11px] font-bold tracking-wider">
		{#each SUPPORTED_LOCALES as code (code)}
			<button
				type="button"
				class="rounded-md px-3 py-1.5 transition-colors"
				class:bg-navy={locale.current === code}
				class:text-bg={locale.current === code}
				class:text-muted={locale.current !== code}
				onclick={() => locale.set(code)}
			>
				{LOCALE_LABELS[code]}
			</button>
		{/each}
	</div>
</section>

<!-- Tip jar placeholder (§6.7). TODO: wire up tip jar provider — see plan §10. -->
<section class="bg-surface border-border mt-8 rounded-xl border p-5">
	<div class="eyebrow"><Heart size={12} aria-hidden="true" /> {m.about_support_eyebrow()}</div>
	<h2 class="font-display mt-2 text-xl leading-tight">{m.about_support_title()}</h2>
	<p class="text-muted mt-2 text-xs leading-relaxed">{m.about_support_text()}</p>
	<button
		type="button"
		disabled
		class="bg-bg-alt text-muted mt-3 inline-flex cursor-not-allowed items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold tracking-wider uppercase"
	>
		{m.about_coming_soon()}
	</button>
</section>

<section class="mt-8">
	<h2 class="font-mono text-text/70 text-[11px] font-bold tracking-widest uppercase">
		{m.about_disclaimer_header()}
	</h2>
	<p class="text-muted mt-2 text-xs leading-relaxed">
		{m.about_disclaimer_text()}
	</p>
</section>

<footer class="text-muted-light mt-10 text-center text-[10px]">
	mundial26.co · v0.1 · {m.common_made_with_care()}
</footer>
