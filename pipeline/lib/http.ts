import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import robotsParser from 'robots-parser';

/**
 * Polite HTTP client for adapters.
 * - Identifies itself with USER_AGENT and obeys robots.txt for ROBOTS_TOKEN.
 * - One request at a time per host, at least minDelayMs apart (or the
 *   site's Crawl-delay, capped at maxDelayMs).
 * - Optional disk cache for development and offline runs.
 */

export const USER_AGENT = 'IzietBot/0.1 (+https://iziet.lv/par)';
export const ROBOTS_TOKEN = 'IzietBot';

const DEFAULT_TIMEOUT_MS = 20_000;
const MAX_BODY_BYTES = 8 * 1024 * 1024;
const RETRY_DELAYS_MS = [2_000, 5_000];

export class RobotsDisallowedError extends Error {
	constructor(public readonly url: string) {
		super(`robots.txt disallows ${url}`);
		this.name = 'RobotsDisallowedError';
	}
}

export class HttpError extends Error {
	constructor(
		public readonly status: number,
		public readonly url: string
	) {
		super(`HTTP ${status} for ${url}`);
		this.name = 'HttpError';
	}
}

export interface FetchOptions {
	headers?: Record<string, string>;
	timeoutMs?: number;
	method?: 'GET' | 'POST';
	body?: string;
}

export interface Http {
	text(url: string, options?: FetchOptions): Promise<string>;
	json<T = unknown>(url: string, options?: FetchOptions): Promise<T>;
	/** True when robots.txt allows IzietBot to fetch the URL. */
	isAllowed(url: string): Promise<boolean>;
}

export interface HttpConfig {
	userAgent?: string;
	minDelayMs?: number;
	maxDelayMs?: number;
	/** Directory for the response cache. Unset disables caching. */
	cacheDir?: string;
	/** Serve cached responses younger than this without a request. */
	cacheTtlMs?: number;
	/** Only read from the cache; never touch the network. */
	offline?: boolean;
	fetchImpl?: typeof fetch;
	log?: (message: string) => void;
}

interface RobotsEntry {
	isAllowed: (url: string) => boolean;
	delayMs: number;
	/** Set when robots.txt could not be fetched (host down or blocking), as opposed to a real Disallow. */
	unreachable?: string;
}

export class HostUnreachableError extends Error {
	constructor(
		public readonly origin: string,
		reason: string
	) {
		super(`Host unreachable (${origin}): ${reason}`);
		this.name = 'HostUnreachableError';
	}
}

interface CachedResponse {
	url: string;
	fetchedAt: string;
	body: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function createHttp(config: HttpConfig = {}): Http {
	const userAgent = config.userAgent ?? USER_AGENT;
	const minDelayMs = config.minDelayMs ?? 1_000;
	const maxDelayMs = config.maxDelayMs ?? 30_000;
	const fetchImpl = config.fetchImpl ?? fetch;
	const log = config.log ?? (() => {});
	const robotsCache = new Map<string, Promise<RobotsEntry>>();
	const hostQueues = new Map<string, Promise<void>>();
	const lastRequestAt = new Map<string, number>();

	function cacheFile(key: string): string | undefined {
		if (!config.cacheDir) return undefined;
		const hash = createHash('sha1').update(key).digest('hex');
		return path.join(config.cacheDir, `${hash}.json`);
	}

	async function readCache(key: string): Promise<CachedResponse | undefined> {
		const file = cacheFile(key);
		if (!file) return undefined;
		try {
			return JSON.parse(await readFile(file, 'utf8')) as CachedResponse;
		} catch {
			return undefined;
		}
	}

	async function writeCache(key: string, url: string, body: string): Promise<void> {
		const file = cacheFile(key);
		if (!file) return;
		await mkdir(path.dirname(file), { recursive: true });
		const entry: CachedResponse = { url, fetchedAt: new Date().toISOString(), body };
		await writeFile(file, JSON.stringify(entry));
	}

	/** Runs `task` after earlier requests to the same host, spaced by the delay. */
	async function scheduled<T>(host: string, delayMs: number, task: () => Promise<T>): Promise<T> {
		const previous = hostQueues.get(host) ?? Promise.resolve();
		let release: () => void = () => {};
		const current = new Promise<void>((resolve) => (release = resolve));
		hostQueues.set(host, previous.then(() => current));
		await previous;
		try {
			const wait = (lastRequestAt.get(host) ?? 0) + delayMs - Date.now();
			if (wait > 0) await sleep(wait);
			return await task();
		} finally {
			lastRequestAt.set(host, Date.now());
			release();
		}
	}

	async function rawFetch(url: string, options: FetchOptions): Promise<string> {
		const response = await fetchImpl(url, {
			method: options.method ?? 'GET',
			body: options.body,
			headers: { 'User-Agent': userAgent, 'Accept-Language': 'lv,en;q=0.8', ...options.headers },
			redirect: 'follow',
			signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
		});
		if (!response.ok) throw new HttpError(response.status, url);
		const length = Number(response.headers.get('content-length') ?? 0);
		if (length > MAX_BODY_BYTES) throw new Error(`Response too large (${length} bytes) for ${url}`);
		const body = await response.text();
		if (body.length > MAX_BODY_BYTES) throw new Error(`Response too large for ${url}`);
		return body;
	}

	function loadRobots(origin: string): Promise<RobotsEntry> {
		const cached = robotsCache.get(origin);
		if (cached) return cached;
		const robotsUrl = `${origin}/robots.txt`;
		const promise = (async (): Promise<RobotsEntry> => {
			let text = '';
			try {
				text = await rawFetch(robotsUrl, { timeoutMs: 15_000 });
			} catch (error) {
				// RFC 9309: a 4xx means no rules. Anything else means we cannot know, so stay out.
				if (error instanceof HttpError && error.status >= 400 && error.status < 500) {
					return { isAllowed: () => true, delayMs: minDelayMs };
				}
				log(`robots.txt unreachable for ${origin}: ${(error as Error).message}`);
				return { isAllowed: () => false, delayMs: minDelayMs, unreachable: (error as Error).message };
			}
			const parser = robotsParser(robotsUrl, text);
			const crawlDelay = parser.getCrawlDelay(ROBOTS_TOKEN) ?? 0;
			const delayMs = Math.min(maxDelayMs, Math.max(minDelayMs, crawlDelay * 1000));
			return { isAllowed: (url) => parser.isAllowed(url, ROBOTS_TOKEN) !== false, delayMs };
		})();
		robotsCache.set(origin, promise);
		return promise;
	}

	async function isAllowed(url: string): Promise<boolean> {
		if (config.offline) return true;
		const { origin } = new URL(url);
		const robots = await loadRobots(origin);
		return robots.isAllowed(url);
	}

	async function text(url: string, options: FetchOptions = {}): Promise<string> {
		const key = `${options.method ?? 'GET'} ${url} ${options.body ?? ''}`;
		const cached = await readCache(key);
		if (config.offline) {
			if (cached) return cached.body;
			throw new Error(`Offline and not cached: ${url}`);
		}
		if (cached && config.cacheTtlMs && Date.now() - Date.parse(cached.fetchedAt) < config.cacheTtlMs) {
			return cached.body;
		}
		const { origin, host } = new URL(url);
		const robots = await loadRobots(origin);
		if (robots.unreachable) throw new HostUnreachableError(origin, robots.unreachable);
		if (!robots.isAllowed(url)) throw new RobotsDisallowedError(url);

		let lastError: unknown;
		for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
			try {
				const body = await scheduled(host, robots.delayMs, () => rawFetch(url, options));
				await writeCache(key, url, body);
				return body;
			} catch (error) {
				lastError = error;
				const retryable =
					!(error instanceof HttpError) || error.status === 429 || error.status === 503 || error.status === 502;
				if (!retryable || attempt === RETRY_DELAYS_MS.length) break;
				await sleep(RETRY_DELAYS_MS[attempt]);
			}
		}
		throw lastError;
	}

	async function json<T>(url: string, options: FetchOptions = {}): Promise<T> {
		const body = await text(url, { ...options, headers: { Accept: 'application/json', ...options.headers } });
		return JSON.parse(body) as T;
	}

	return { text, json, isAllowed };
}
