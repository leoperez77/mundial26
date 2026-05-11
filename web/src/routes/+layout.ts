// SPA mode: skip prerendering and SSR for every route. The PWA loads the
// album JSON client-side from /data/panini-wc2026.json (cached in IndexedDB).
// Phase 5 can re-enable prerender on the static routes (/, /browse, /about)
// for SEO + the sitemap.
export const ssr = false;
export const prerender = false;
