import { test, expect } from '@playwright/test';

/**
 * Reproduce the user-reported regression: typing "col-19" filters nothing,
 * even though Colombia's sticker 19 clearly exists (see /browse → /c/COL).
 */
test.describe('Home search — single-field mode', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		// Wait for client-side hydration + album fetch.
		await expect(page.getByRole('heading', { name: /encontr|find/i })).toBeVisible();
		await page.waitForFunction(
			() => indexedDB.databases().then((dbs) => dbs.some((d) => d.name === 'keyval-store')),
			null,
			{ timeout: 5000 }
		);
	});

	test('partial country code "co" surfaces Colombia in the dropdown', async ({ page }) => {
		const input = page.getByRole('searchbox', { name: /buscar|search/i });
		await input.fill('co');
		await page.waitForTimeout(250);
		await expect(page.getByText(/colombia/i).first()).toBeVisible();
	});

	test('exact sticker code "col-19" surfaces a result in the dropdown', async ({ page }) => {
		const input = page.getByRole('searchbox', { name: /buscar|search/i });
		await input.fill('col-19');
		await page.waitForTimeout(250);
		// We expect SOMETHING actionable to appear — either the sticker itself
		// or at least the COL country card.
		const dropdown = page.locator('ul').filter({ hasText: /col-19|colombia/i });
		await expect(dropdown).toBeVisible({ timeout: 2000 });
	});

	test('exact country code "col" surfaces Colombia in the dropdown', async ({ page }) => {
		const input = page.getByRole('searchbox', { name: /buscar|search/i });
		await input.fill('col');
		await page.waitForTimeout(250);
		const dropdown = page.locator('ul').filter({ hasText: /colombia/i });
		await expect(dropdown).toBeVisible({ timeout: 2000 });
	});

	test('Enter on a valid sticker code navigates to /s/COL-19', async ({ page }) => {
		const input = page.getByRole('searchbox', { name: /buscar|search/i });
		await input.fill('col-19');
		await input.press('Enter');
		await expect(page).toHaveURL(/\/s\/COL-19$/i);
	});
});
