/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

/**
 * Offline support (research 5.12):
 * - App shell, prerendered pages and fonts: precached per version, cache-first.
 * - /data/*.json: stale-while-revalidate, so cached events show at once offline.
 * - Event images from other sites: cache-first, at most 150 entries.
 * - Pages: network first, cached copy when offline.
 */
import { build, files, prerendered, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const SHELL_CACHE = `shell-${version}`;
const DATA_CACHE = 'data-v1';
const IMAGE_CACHE = 'images-v1';
const MAX_IMAGES = 150;

const PRECACHE = [...build, ...files.filter((file) => !file.startsWith('/data/') && !file.startsWith('/icons/')), ...prerendered];
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

async function staleWhileRevalidate(request: Request): Promise<Response> {
	const cache = await caches.open(DATA_CACHE);
	const cached = await cache.match(request, { ignoreSearch: true });
	const network = fetch(request)
		.then((response) => {
			if (response.ok) cache.put(request, response.clone());
			return response;
		})
		.catch(() => cached ?? Response.error());
	return cached ?? network;
}

async function trimCache(name: string, max: number): Promise<void> {
	const cache = await caches.open(name);
	const keys = await cache.keys();
	for (const key of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(key);
}

async function cacheFirstImage(request: Request): Promise<Response> {
	const cache = await caches.open(IMAGE_CACHE);
	const cached = await cache.match(request);
	if (cached) return cached;
	const response = await fetch(request);
	if (response.ok || response.type === 'opaque') {
		await cache.put(request, response.clone());
		trimCache(IMAGE_CACHE, MAX_IMAGES);
	}
	return response;
}

async function networkFirstPage(request: Request): Promise<Response> {
	try {
		const response = await fetch(request);
		if (response.ok) {
			const cache = await caches.open(SHELL_CACHE);
			cache.put(new URL(request.url).pathname, response.clone());
		}
		return response;
	} catch {
		const cache = await caches.open(SHELL_CACHE);
		const path = new URL(request.url).pathname;
		return (await cache.match(path)) ?? (await cache.match('/')) ?? Response.error();
	}
}

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);

	if (url.origin === sw.location.origin) {
		if (url.pathname.startsWith('/data/')) {
			event.respondWith(staleWhileRevalidate(request));
			return;
		}
		if (request.mode === 'navigate') {
			event.respondWith(networkFirstPage(request));
			return;
		}
		if (PRECACHED.has(url.pathname)) {
			event.respondWith(caches.match(url.pathname).then((cached) => cached ?? fetch(request)));
		}
		return;
	}

	if (request.destination === 'image') {
		event.respondWith(cacheFirstImage(request).catch(() => Response.error()));
	}
});
