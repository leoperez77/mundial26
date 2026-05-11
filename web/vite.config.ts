import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			strategy: ['localStorage', 'preferredLanguage', 'baseLocale']
		}),
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			strategies: 'generateSW',
			manifest: {
				name: 'Mundial 26',
				short_name: 'Mundial26',
				description: 'Sticker lookup for the Panini FIFA World Cup 2026™ album.',
				theme_color: '#0E1F3F',
				background_color: '#F4F1E8',
				display: 'standalone',
				orientation: 'portrait',
				start_url: '/',
				scope: '/',
				lang: 'es',
				categories: ['sports', 'utilities', 'entertainment'],
				icons: [
					{ src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
					{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
					{ src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
					{
						src: 'maskable-icon-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
				navigateFallback: '/',
				// Take over from any existing SW immediately so users picking up a
				// new deploy don't see stale cached HTML/CSS until they close every
				// tab. Combined with registerType: 'autoUpdate' above, this gives a
				// reload-on-next-paint update model.
				skipWaiting: true,
				clientsClaim: true,
				runtimeCaching: [
					{
						// Network-first for the album JSON so corrections roll out fast,
						// with cache fallback when the user is offline.
						urlPattern: /\/data\/panini-wc2026\.json$/,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'album-data',
							networkTimeoutSeconds: 3,
							expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 * 30 }
						}
					},
					{
						// Google Fonts CSS — versioned by query string, stale-while-revalidate.
						urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
						handler: 'StaleWhileRevalidate',
						options: { cacheName: 'google-fonts-css' }
					},
					{
						// Google Fonts files — immutable, cache forever.
						urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
						handler: 'CacheFirst',
						options: {
							cacheName: 'google-fonts-files',
							expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }
						}
					}
				]
			},
			devOptions: {
				enabled: false,
				type: 'module'
			}
		})
	]
});
