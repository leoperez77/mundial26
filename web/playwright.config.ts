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
			// Mobile viewport on Chromium — useful for cross-browser layout coverage.
			name: 'mobile',
			use: {
				...devices['Pixel 7'],
				viewport: { width: 390, height: 844 }
			}
		},
		{
			// Real WebKit engine at iPhone 13 dimensions — catches iOS-Safari-
			// specific overflow behaviour that Chromium's overflow-x:hidden hides.
			name: 'iphone',
			use: { ...devices['iPhone 13'] }
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
