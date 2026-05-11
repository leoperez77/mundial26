import { browser } from '$app/environment';
import * as paraglide from '$lib/paraglide/runtime.js';

export type Locale = (typeof paraglide.locales)[number];
export const SUPPORTED_LOCALES = paraglide.locales as readonly Locale[];

/**
 * Reactive wrapper around Paraglide's locale runtime.
 *
 * Paraglide's `m.foo()` calls read the locale via `getLocale()`. By overriding
 * it to read from a Svelte 5 $state, every `m.foo()` call inside a template /
 * $derived / $effect establishes a reactive dependency on `locale.current` —
 * setting it triggers re-renders of every translated string.
 *
 * The overwrite is installed at module-load time (below) so it's in place
 * before any component renders and calls `m.foo()`. Doing it in onMount
 * was too late: components that had already evaluated their $derived /
 * template expressions wouldn't track the locale and wouldn't re-render
 * when the user switched languages.
 */
class LocaleStore {
	current = $state<Locale>(paraglide.baseLocale as Locale);

	set(next: Locale): void {
		if (!SUPPORTED_LOCALES.includes(next)) return;
		this.current = next;
		if (browser) {
			try {
				localStorage.setItem(paraglide.localStorageKey, next);
			} catch {
				/* private browsing — silent no-op */
			}
		}
	}
}

export const locale = new LocaleStore();

if (browser) {
	// 1. Run Paraglide's configured strategy chain (localStorage →
	//    preferredLanguage → baseLocale) to detect the initial locale —
	//    must happen BEFORE we overwrite getLocale, otherwise the chain
	//    short-circuits to `locale.current`'s default value.
	const detected = paraglide.getLocale() as Locale;
	locale.current = detected;

	// 2. Install the reactive wrapper so all subsequent `m.foo()` calls
	//    read the $state and re-evaluate when it changes.
	paraglide.overwriteGetLocale(() => locale.current);
}
