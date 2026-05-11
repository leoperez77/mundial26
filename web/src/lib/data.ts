import { browser } from '$app/environment';
import { get, set } from 'idb-keyval';
import type { AlbumData } from './types';

const KEY = 'mundial26:album';
const DATA_URL = '/data/panini-wc2026.json';

/**
 * Cache-first loader.
 * - First visit: fetch + parse + store in IndexedDB.
 * - Subsequent visits: read from IndexedDB, kick off a background refresh.
 * - Offline: returns whatever's cached; throws if nothing's cached.
 */
export async function loadAlbumData(): Promise<AlbumData> {
	if (!browser) {
		// SSR / prerender path: fetch directly, skip IndexedDB.
		return await fetchJson();
	}

	const cached = await get<AlbumData>(KEY);
	if (cached) {
		refreshInBackground();
		return cached;
	}
	return await fetchAndCache();
}

async function fetchJson(): Promise<AlbumData> {
	const res = await fetch(DATA_URL);
	if (!res.ok) throw new Error(`Failed to load album data: ${res.status}`);
	return (await res.json()) as AlbumData;
}

async function fetchAndCache(): Promise<AlbumData> {
	const data = await fetchJson();
	await set(KEY, data);
	return data;
}

async function refreshInBackground(): Promise<void> {
	try {
		const res = await fetch(DATA_URL, { cache: 'no-cache' });
		if (!res.ok) return;
		const fresh = (await res.json()) as AlbumData;
		const cached = await get<AlbumData>(KEY);
		if (!cached || fresh.generated_at > cached.generated_at) {
			await set(KEY, fresh);
		}
	} catch {
		// Offline — ignore.
	}
}
