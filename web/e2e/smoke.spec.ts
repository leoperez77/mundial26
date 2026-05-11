import { test, expect } from '@playwright/test';

/**
 * High-level smoke tests covering plan §14 acceptance criteria.
 *
 * Run against the live deploy with:
 *   PLAYWRIGHT_BASE_URL=https://mundial26.co npm run test:e2e
 */
test.describe('PWA + i18n smoke', () => {
	test('home renders with brand chrome + countdown', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('link', { name: /mundial 26/i })).toBeVisible();
		await expect(page.getByText(/days$/i)).toBeVisible(); // header countdown
		await expect(page.getByText(/MEX · USA · CAN/i)).toBeVisible(); // kick-off banner
	});

	test('manifest.webmanifest is valid + has correct name and icons', async ({ request }) => {
		const res = await request.get('/manifest.webmanifest');
		expect(res.status()).toBe(200);
		const manifest = await res.json();
		expect(manifest.name).toBe('Mundial 26');
		expect(manifest.short_name).toBe('Mundial26');
		expect(manifest.display).toBe('standalone');
		expect(manifest.theme_color).toBe('#0E1F3F');
		expect(manifest.icons?.length).toBeGreaterThanOrEqual(3);
		// Must have a maskable icon for Android adaptive icons.
		expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
	});

	test('service worker is reachable and registers on load', async ({ page }) => {
		const swRes = await page.request.get('/sw.js');
		expect(swRes.status()).toBe(200);

		await page.goto('/');
		// Give the layout's onMount registerSW a beat to run.
		await page.waitForTimeout(2000);
		const swState = await page.evaluate(async () => {
			if (!('serviceWorker' in navigator)) return null;
			const reg = await navigator.serviceWorker.getRegistration();
			return reg ? { active: !!reg.active, installing: !!reg.installing, waiting: !!reg.waiting } : null;
		});
		expect(swState).not.toBeNull();
	});

	test('sitemap.xml lists 1011 URLs (3 static + 48 countries + 960 stickers)', async ({ request }) => {
		const res = await request.get('/sitemap.xml');
		expect(res.status()).toBe(200);
		const body = await res.text();
		const count = (body.match(/<url>/g) ?? []).length;
		expect(count).toBe(1011);
	});

	test('robots.txt allows all + references sitemap', async ({ request }) => {
		const res = await request.get('/robots.txt');
		expect(res.status()).toBe(200);
		const body = await res.text();
		expect(body).toContain('User-agent: *');
		expect(body).toContain('Allow:');
		expect(body).toMatch(/Sitemap:\s+https?:\/\/.*sitemap\.xml/);
	});

	test('country detail renders for ARG with page + group', async ({ page }) => {
		await page.goto('/c/ARG');
		await expect(page.getByRole('heading', { name: /argentina/i })).toBeVisible({ timeout: 8000 });
		await expect(page.getByText(/82/)).toBeVisible(); // ARG page from the album TOC
		await expect(page.getByText(/group j|grupo j/i)).toBeVisible();
	});

	test('sticker detail renders + has share button', async ({ page }) => {
		await page.goto('/s/COL-19');
		// COL-19 happens to be the Colombia "Luis Díaz" sticker (verify by code only).
		await expect(page.locator('text=/COL-19/i').first()).toBeVisible({ timeout: 8000 });
		await expect(page.getByText(/96/).first()).toBeVisible(); // Colombia page
		await expect(page.getByRole('button', { name: /share|compart/i })).toBeVisible();
	});

	test('language switcher cycles es → en → pt and bottom nav reactively updates', async ({
		page
	}) => {
		await page.goto('/about');
		const nav = page.locator('nav');

		// Force es first to have a stable baseline.
		await page.getByRole('button', { name: 'Español' }).click();
		await expect(nav.getByText(/^Buscar$/)).toBeVisible();
		await expect(nav.getByText(/^Explorar$/)).toBeVisible();
		await expect(nav.getByText(/^Acerca$/)).toBeVisible();

		await page.getByRole('button', { name: 'English' }).click();
		await expect(nav.getByText(/^Lookup$/)).toBeVisible();
		await expect(nav.getByText(/^Browse$/)).toBeVisible();
		await expect(nav.getByText(/^About$/)).toBeVisible();

		await page.getByRole('button', { name: 'Português' }).click();
		// pt: Buscar / Explorar / Sobre
		await expect(nav.getByText(/^Buscar$/)).toBeVisible();
		await expect(nav.getByText(/^Sobre$/)).toBeVisible();
	});
});
