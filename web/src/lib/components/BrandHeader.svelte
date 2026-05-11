<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';

	const KICKOFF = new Date('2026-06-11T20:00:00Z').getTime();

	let now = $state(Date.now());

	$effect(() => {
		const id = setInterval(() => (now = Date.now()), 1000 * 60);
		return () => clearInterval(id);
	});

	const days = $derived(Math.max(0, Math.floor((KICKOFF - now) / 86_400_000)));
</script>

<header class="border-border bg-bg/95 sticky top-0 z-30 border-b backdrop-blur">
	<div class="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
		<a href="/" class="flex items-center gap-2">
			<!-- Trophy mark (§7.6 motif 4) — gold on cream, no box. -->
			<svg
				width="22"
				height="22"
				viewBox="0 0 24 24"
				fill="none"
				aria-hidden="true"
				class="text-gold-deep"
			>
				<path
					d="M7 4h10v2.5a5 5 0 0 1-3.5 4.78V13h1.5a.5.5 0 0 1 .5.5V15h-7v-1.5a.5.5 0 0 1 .5-.5h1.5v-1.72A5 5 0 0 1 7 6.5V4Zm-2 1h2v2.5a3.5 3.5 0 0 0 1 2.46A4.5 4.5 0 0 1 5 6V5Zm12 0h2v1a4.5 4.5 0 0 1-3 3.96A3.5 3.5 0 0 0 17 7.5V5ZM7.5 17h9v2h-9v-2Z"
					stroke="currentColor"
					stroke-width="0.5"
					fill="currentColor"
				/>
			</svg>
			<span class="font-display text-text text-lg leading-none tracking-tight">MUNDIAL 26</span>
		</a>

		<div
			class="font-mono text-text/80 flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase"
		>
			<span class="relative inline-flex h-2 w-2">
				<span class="bg-red absolute inset-0 rounded-full opacity-30"></span>
				<span class="bg-red absolute inset-[2px] rounded-full"></span>
			</span>
			<span>{days} {m.header_days()}</span>
		</div>
	</div>
</header>
