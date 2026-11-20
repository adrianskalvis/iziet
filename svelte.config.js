import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// Every route is prerendered. Event and list pages read their state from
		// the query string, so static hosting needs no rewrite rules.
		adapter: adapter({ pages: 'build', assets: 'build', strict: true }),
		alias: {
			$locales: 'locales',
			$shared: 'src/lib/shared'
		},
		serviceWorker: { register: false },
		prerender: { handleHttpError: 'fail' }
	}
};

export default config;
