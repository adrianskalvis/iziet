import { describe, expect, test } from 'vitest';
import { createHttp, RobotsDisallowedError } from './http';

/** Minimal fake fetch: maps URL to a Response factory. */
function fakeFetch(routes: Record<string, () => Response>): typeof fetch {
	return (async (input: RequestInfo | URL) => {
		const url = String(input);
		const route = routes[url];
		return route ? route() : new Response('not found', { status: 404 });
	}) as typeof fetch;
}

describe('createHttp', () => {
	test('obeys robots.txt for IzietBot', async () => {
		const http = createHttp({
			minDelayMs: 0,
			fetchImpl: fakeFetch({
				'https://a.lv/robots.txt': () => new Response('User-agent: *\nDisallow: /private'),
				'https://a.lv/public': () => new Response('ok')
			})
		});
		expect(await http.text('https://a.lv/public')).toBe('ok');
		await expect(http.text('https://a.lv/private/x')).rejects.toBeInstanceOf(RobotsDisallowedError);
	});

	test('follows a same-site redirect and refuses a cross-site one', async () => {
		const http = createHttp({
			minDelayMs: 0,
			fetchImpl: fakeFetch({
				'https://b.lv/robots.txt': () => new Response(''),
				'https://www.b.lv/robots.txt': () => new Response(''),
				'https://b.lv/old': () => new Response(null, { status: 301, headers: { location: 'https://www.b.lv/new' } }),
				'https://www.b.lv/new': () => new Response('moved'),
				'https://b.lv/away': () => new Response(null, { status: 302, headers: { location: 'https://evil.example/x' } })
			})
		});
		expect(await http.text('https://b.lv/old')).toBe('moved');
		await expect(http.text('https://b.lv/away')).rejects.toThrow(/Cross-site redirect/);
	});

	test('stops reading a body over 8 MB', async () => {
		const big = new Uint8Array(9 * 1024 * 1024);
		const http = createHttp({
			minDelayMs: 0,
			fetchImpl: fakeFetch({
				'https://c.lv/robots.txt': () => new Response(''),
				'https://c.lv/big': () => new Response(big)
			})
		});
		await expect(http.text('https://c.lv/big')).rejects.toThrow(/too large/);
	});

	test('names the Cloudflare reason when a request is refused', async () => {
		const http = createHttp({
			minDelayMs: 0,
			fetchImpl: fakeFetch({
				'https://d.lv/robots.txt': () => new Response(''),
				'https://d.lv/challenge': () =>
					new Response('<title>Just a moment...</title>', { status: 403, headers: { server: 'cloudflare', 'cf-mitigated': 'challenge' } }),
				'https://d.lv/rule': () =>
					new Response('<span>Error</span><span>1020</span> Access denied', { status: 403, headers: { server: 'cloudflare' } }),
				'https://d.lv/country': () => new Response('error code: 1009', { status: 403, headers: { server: 'cloudflare' } }),
				'https://d.lv/plain': () => new Response('no', { status: 403 })
			})
		});
		await expect(http.text('https://d.lv/challenge')).rejects.toThrow('HTTP 403 for https://d.lv/challenge (Cloudflare bot challenge)');
		await expect(http.text('https://d.lv/rule')).rejects.toThrow('(Cloudflare error 1020)');
		await expect(http.text('https://d.lv/country')).rejects.toThrow('(Cloudflare error 1009)');
		await expect(http.text('https://d.lv/plain')).rejects.toThrow(/^HTTP 403 for https:\/\/d\.lv\/plain$/);
	});
});
