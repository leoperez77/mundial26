import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { AlbumData } from '$lib/types';

// Prerender this route at build time so adapter-static writes a real
// sitemap.xml file to disk.
export const prerender = true;

const SITE = 'https://mundial26.co';
const STATIC_ROUTES = ['/', '/browse', '/about'];

export async function GET() {
	// Read the album JSON from the static dir at build time so we can list every
	// /c/[code] and /s/[code] URL.
	const albumPath = join(process.cwd(), 'static', 'data', 'panini-wc2026.json');
	const album = JSON.parse(await readFile(albumPath, 'utf-8')) as AlbumData;

	const urls: string[] = [];
	for (const route of STATIC_ROUTES) urls.push(`${SITE}${route}`);
	for (const c of album.countries) {
		urls.push(`${SITE}/c/${c.code}`);
		for (const s of c.stickers) urls.push(`${SITE}/s/${s.code}`);
	}

	const lastmod = album.generated_at.slice(0, 10);
	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
	.map(
		(u) =>
			`	<url><loc>${u}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq></url>`
	)
	.join('\n')}
</urlset>
`;

	return new Response(body, {
		headers: { 'Content-Type': 'application/xml; charset=utf-8' }
	});
}
