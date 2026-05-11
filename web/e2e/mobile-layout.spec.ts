import { test, expect } from '@playwright/test';

/**
 * Mobile-viewport layout regression suite. Run as the `mobile` project
 * (configured in playwright.config.ts).
 *
 * Targets the issues found via real-phone smoke test:
 *   1. Spanish headline overflowed iPhone viewport → horizontal scroll.
 *   2. Country name (e.g. ARGENTINA) cut off behind the flag emoji.
 *   3. Sticker list rows truncated names to a single char + ellipsis
 *      because of the redundant #N column.
 *   4. "Grupo J" badge wrapped onto two lines on narrow screens.
 */

async function assertNoHorizontalScroll(page: import('@playwright/test').Page) {
	const overflow = await page.evaluate(() => {
		const html = document.documentElement;
		const body = document.body;
		return {
			scrollWidth: html.scrollWidth,
			clientWidth: html.clientWidth,
			bodyScrollWidth: body.scrollWidth,
			bodyClientWidth: body.clientWidth
		};
	});
	expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
	expect(overflow.bodyScrollWidth).toBeLessThanOrEqual(overflow.bodyClientWidth);
}

test.describe('Mobile layout — no overflow / truncation regressions', () => {
	test('home page: Spanish headline does not cause horizontal scroll', async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem('PARAGLIDE_LOCALE', 'es'));
		await page.goto('/');
		await expect(page.getByRole('heading', { name: /encontr/i })).toBeVisible();
		await assertNoHorizontalScroll(page);
	});

	test('home page: focusing search input does not shift viewport horizontally', async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem('PARAGLIDE_LOCALE', 'es'));
		await page.goto('/');
		await page.getByRole('searchbox').click();
		await page.waitForTimeout(200);
		await assertNoHorizontalScroll(page);
	});

	test('country detail /c/ARG: name + group badge fit + sticker names are readable', async ({
		page
	}) => {
		await page.goto('/c/ARG');
		await expect(page.getByRole('heading', { name: /argentina/i })).toBeVisible({ timeout: 8000 });
		await assertNoHorizontalScroll(page);

		// "ARGENTINA" should be rendered, not clipped behind the flag — check
		// the bounding box has reasonable width.
		const headingBox = await page.getByRole('heading', { name: /argentina/i }).boundingBox();
		expect(headingBox).not.toBeNull();
		expect(headingBox!.width).toBeGreaterThan(80); // not a 1-char wedge

		// "Group J" / "Grupo J" badge must be on one line — height ≤ a single
		// line-height (with padding, ~24px).
		const badge = page.getByText(/^(group|grupo)\s+j$/i).first();
		await expect(badge).toBeVisible();
		const badgeBox = await badge.boundingBox();
		expect(badgeBox!.height).toBeLessThan(30);

		// Sticker rows: the player-name span should have enough width to show
		// more than just a single character.
		const firstPlayerRow = page.locator('li#sticker-2'); // sticker #2 is the first player
		await expect(firstPlayerRow).toBeVisible();
		const nameSpan = firstPlayerRow.locator('span').filter({ hasText: /\w{3,}/ }).first();
		const nameBox = await nameSpan.boundingBox();
		expect(nameBox!.width).toBeGreaterThan(80);
	});
});
