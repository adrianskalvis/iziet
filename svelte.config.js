import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** Hash of the small inline script in src/app.html, so the CSP can allow exactly that script. */
function inlineScriptHashes() {
	const html = readFileSync(new URL('./src/app.html', import.meta.url), 'utf8');
	return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
		(match) => `sha256-${createHash('sha256').update(match[1]).digest('base64')}`
	);
}

const supabaseUrl = process.env.VITE_FEATURE_SYNC === '1' ? process.env.VITE_SUPABASE_URL : undefined;

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
		prerender: { handleHttpError: 'fail' },
		// SvelteKit adds hashes of its own inline scripts to a CSP meta tag on every prerendered page.
		csp: {
			mode: 'hash',
			directives: {
				'default-src': ['self'],
				'script-src': ['self', ...inlineScriptHashes()],
				'style-src': ['self', 'unsafe-inline'],
				'img-src': ['self', 'https:', 'data:', 'blob:'],
				'font-src': ['self'],
				'connect-src': ['self', ...(supabaseUrl ? [supabaseUrl] : [])],
				'manifest-src': ['self'],
				'worker-src': ['self'],
				'base-uri': ['self'],
				'form-action': ['self'],
				'object-src': ['none'],
				'upgrade-insecure-requests': true
			}
		}
	}
};

export default config;
