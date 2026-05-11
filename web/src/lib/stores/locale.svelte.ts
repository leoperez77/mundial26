import { browser } from '$app/environment';
import * as paraglide from '$lib/paraglide/runtime.js';

export type Locale = (typeof paraglide.locales)[number];
export const SUPPORTED_LOCALES = paraglide.locales as readonly Locale[];

/**
 * Reactive wrapper around Paraglide's locale runtime.
 *
 * Why the indirection: Paraglide's `m.foo()` calls read locale via
 * `getLocale()`. By overriding it to read from a Svelte 5 $state, every
 * `m.foo()` call inside a template / $derived / $effect becomes reactive —
 * setting `locale.current` triggers re-renders of every translated string.
 */
class LocaleStore {
	current = $state<Locale>(paraglide.baseLocale as Locale);
	private initialized = false;

	init(): void {
		if (this.initialized) return;
		this.initialized = true;
		// Trigger Paraglide's configured strategy chain
		// (localStorage → preferredLanguage → baseLocale) for the initial value.
		this.current = paraglide.getLocale() as Locale;
		paraglide.overwriteGetLocale(() => this.current);
	}

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
