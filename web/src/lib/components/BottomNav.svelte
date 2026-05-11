<script lang="ts">
	import { page } from '$app/state';
	import { Search, Grid3x3, Info } from 'lucide-svelte';

	const items = [
		{ href: '/', label: 'Lookup', icon: Search, match: (p: string) => p === '/' },
		{
			href: '/browse',
			label: 'Browse',
			icon: Grid3x3,
			match: (p: string) => p.startsWith('/browse') || p.startsWith('/c/') || p.startsWith('/s/')
		},
		{ href: '/about', label: 'About', icon: Info, match: (p: string) => p.startsWith('/about') }
	];
</script>

<nav
	class="bg-navy fixed inset-x-0 bottom-0 z-30"
	style="padding-bottom: env(safe-area-inset-bottom, 0px);"
>
	<div class="mx-auto flex max-w-3xl">
		{#each items as item (item.href)}
			{@const active = item.match(page.url.pathname)}
			<a
				href={item.href}
				class="relative flex flex-1 flex-col items-center gap-1 pt-4 pb-3 text-[10px] font-bold tracking-wider uppercase"
				style:color={active ? 'var(--color-bg)' : 'rgba(244, 241, 232, 0.55)'}
				aria-current={active ? 'page' : undefined}
			>
				{#if active}
					<!-- Small gold dot indicator above the icon -->
					<span class="bg-gold absolute top-1.5 h-1.5 w-1.5 rounded-full"></span>
				{/if}
				<item.icon size={18} aria-hidden="true" />
				<span>{item.label}</span>
			</a>
		{/each}
	</div>
</nav>
