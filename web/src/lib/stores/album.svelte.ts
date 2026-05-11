import { loadAlbumData } from '$lib/data';
import type { AlbumData, Country, Sticker } from '$lib/types';

/**
 * Singleton album store. Each route subscribes via the exported `album`
 * instance; the data fetch + IndexedDB cache happens once per session.
 */
class AlbumStore {
	data = $state<AlbumData | null>(null);
	error = $state<string | null>(null);
	loading = $state(false);
	private started = false;

	async load(): Promise<void> {
		if (this.data || this.started) return;
		this.started = true;
		this.loading = true;
		try {
			this.data = await loadAlbumData();
		} catch (e) {
			this.error = e instanceof Error ? e.message : String(e);
		} finally {
			this.loading = false;
		}
	}

	countryByCode(code: string): Country | undefined {
		return this.data?.countries.find((c) => c.code === code.toUpperCase());
	}

	stickerByCode(stickerCode: string): { country: Country; sticker: Sticker } | undefined {
		const m = /^([A-Z]{3})-(\d{1,2})$/i.exec(stickerCode);
		if (!m) return undefined;
		const country = this.countryByCode(m[1]);
		if (!country) return undefined;
		const number = Number(m[2]);
		const sticker = country.stickers.find((s) => s.number === number);
		if (!sticker) return undefined;
		return { country, sticker };
	}
}

export const album = new AlbumStore();
