/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

/**
 * Offline support (research 5.12):
 * - App shell, prerendered pages and fonts: precached per version, cache-first.
 * - /data/*.json: network first with a 3 s timeout, so returning users see fresh
 *   events, and the cached copy when the network is slow or gone.
 * - Event images from other sites: cache-first, at most 150 entries, best effort.
 * - Pages: network first with a 3 s timeout, cached copy when offline.
 */
import { base, build, files, prerendered, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const SHELL_CACHE = `shell-${version}`;
const DATA_CACHE = 'data-v1';
const IMAGE_CACHE = 'images-v1';
const MAX_IMAGES = 150;
const DATA_TIMEOUT_MS = 3000;
const PAGE_TIMEOUT_MS = 3000;

const PRECACHE = [...build, ...files.filter((file) => !file.startsWith(`${base}/data/`) && !file.startsWith(`${base}/icons/`)), ...prerendered];
const PRECACHED = new Set(PRECACHE);

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(SHELL_CACHE)
			.then((cache) => cache.addAll(PRECACHE))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((key) => key.startsWith('shell-') && key !== SHELL_CACHE).map((key) => caches.delete(key))))
			.then(() => sw.clients.claim())
	);
});

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error('timeout')), ms);
		promise.then(
			(value) => {
				clearTimeout(timer);
				resolve(value);
			},
			(error) => {
				clearTimeout(timer);
				reject(error);
			}
		);
	});
}

async function freshData(request: Request, event: FetchEvent): Promise<Response> {
	const cache = await caches.open(DATA_CACHE);
	const network = fetch(request).then((response) => {
		if (response.ok) event.waitUntil(cache.put(request, response.clone()).catch(() => {}));
		return response;
	});
	try {
		return await withTimeout(network, DATA_TIMEOUT_MS);
	} catch {
		const cached = await cache.match(request, { ignoreSearch: true });
		return cached ?? network.catch(() => Response.error());
	}
}

async function trimCache(name: string, max: number): Promise<void> {
	const cache = await caches.open(name);
	const keys = await cache.keys();
	for (const key of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(key);
}

async function cacheFirstImage(request: Request, event: FetchEvent): Promise<Response> {
	const cache = await caches.open(IMAGE_CACHE);
	const cached = await cache.match(request);
	if (cached) return cached;
	const response = await fetch(request);
	if (response.ok || response.type === 'opaque') {
		// Best effort: a full storage quota must never hide an image that loaded.
		event.waitUntil(
			cache
				.put(request, response.clone())
				.then(() => trimCache(IMAGE_CACHE, MAX_IMAGES))
				.catch(() => {})
		);
	}
	return response;
}

async function networkFirstPage(request: Request, event: FetchEvent): Promise<Response> {
	const path = new URL(request.url).pathname;
	try {
		const response = await withTimeout(fetch(request), PAGE_TIMEOUT_MS);
		if (response.ok) {
			const cache = await caches.open(SHELL_CACHE);
			event.waitUntil(cache.put(path, response.clone()).catch(() => {}));
		}
		return response;
	} catch {
		const cache = await caches.open(SHELL_CACHE);
		return (await cache.match(path)) ?? (await cache.match(`${path}.html`)) ?? (await cache.match(`${base}/`)) ?? Response.error();
	}
}

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);

	if (url.origin === sw.location.origin) {
		if (url.pathname.startsWith(`${base}/data/`)) {
			event.respondWith(freshData(request, event));
			return;
		}
		if (request.mode === 'navigate') {
			event.respondWith(networkFirstPage(request, event));
			return;
		}
		if (PRECACHED.has(url.pathname)) {
			event.respondWith(caches.match(url.pathname).then((cached) => cached ?? fetch(request)));
		}
		return;
	}

	if (request.destination === 'image') {
		event.respondWith(cacheFirstImage(request, event).catch(() => Response.error()));
	}
});
