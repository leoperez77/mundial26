import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		// Default runtime: Node serverless. With ssr=false on the layout and
		// prerender=false (except for /sitemap.xml), pages are served as a
		// static SPA shell and the only function call is the sitemap response,
		// which is prerendered to a real file at build time.
		adapter: adapter()
	}
};

export default config;
