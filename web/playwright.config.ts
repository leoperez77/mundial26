import { defineConfig, devices } from '@playwright/test';

// Set PLAYWRIGHT_BASE_URL to point at any deploy (Vercel preview, prod, etc.)
// to skip the local build+preview step.
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
	testDir: './e2e',
	timeout: 30_000,
	fullyParallel: true,
	reporter: 'list',
	use: {
		baseURL: externalBaseURL ?? 'http://127.0.0.1:4321',
		trace: 'retain-on-failure'
	},
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
		{
			// Mobile viewport on Chromium — same dimensions as iPhone 13 (390×844)
			// but uses the already-installed Chromium binary instead of pulling
			// down webkit. The layout bugs we're guarding against are
			// viewport-driven, not engine-driven.
			name: 'mobile',
			use: {
				...devices['Pixel 7'],
				viewport: { width: 390, height: 844 }
			}
		}
	],
	webServer: externalBaseURL
		? undefined
		: {
				command: 'npm run build && npm run preview -- --port 4321 --host 127.0.0.1',
				url: 'http://127.0.0.1:4321',
				reuseExistingServer: !process.env.CI,
				timeout: 120_000,
				stdout: 'ignore',
				stderr: 'pipe'
			}
});
