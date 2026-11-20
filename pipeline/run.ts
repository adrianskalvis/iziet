/**
 * Data pipeline: runs every enabled adapter, normalises and deduplicates the
 * events, and writes static/data/events.json and static/data/meta.json.
 *
 *   npm run data                     live run
 *   npm run data -- --offline        replay the HTTP cache only
 *   npm run data -- --only=fienta    run selected adapters (others use their cache)
 *
 * A failing source falls back to its last cached result (data/cache/sources),
 * and a run that would shrink the dataset by more than 80% keeps the old file.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { eventEndMs } from '../src/lib/shared/event-time';
import { fold } from '../src/lib/shared/fold';
import {
	CORE_TIMES,
	DETAIL_KEYS,
	DETAIL_SHARDS,
	shardOf,
	type DataMeta,
	type EventCore,
	type EventDetail,
	type EventItem,
	type RawEvent,
	type SourceStatus
} from '../src/lib/shared/types';
import { isEnabled, loadAdapters } from './adapters/registry';
import type { Adapter } from './adapters/types';
import { dedupe } from './dedupe';
import { createHttp } from './lib/http';
import { normalize } from './normalize';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_CACHE_DIR = path.join(ROOT, 'data/cache/sources');
const HTTP_CACHE_DIR = path.join(ROOT, 'data/cache/http');
const OUT_DIR = path.join(ROOT, 'static/data');
const HORIZON_DAYS = 120;
const CACHE_MAX_AGE_MS = 7 * 24 * 3600_000;
const ADAPTER_TIMEOUT_MS = 12 * 60_000;
const CONCURRENCY = 6;
const PAST_GRACE_MS = 12 * 3600_000;
const MIN_KEEP_RATIO = 0.2;

interface CachedSource {
	fetchedAt: string;
	events: RawEvent[];
}

const args = process.argv.slice(2);
const offline = args.includes('--offline');
const only = args.find((arg) => arg.startsWith('--only='))?.slice(7).split(',');
const log = (message: string) => console.log(message);

async function readJson<T>(file: string): Promise<T | undefined> {
	try {
		return JSON.parse(await readFile(file, 'utf8')) as T;
	} catch {
		return undefined;
	}
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000} s`)), ms);
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

async function runAdapter(adapter: Adapter, now: Date): Promise<{ status: SourceStatus; events: RawEvent[] }> {
	const base = { id: adapter.id, name: adapter.name, homepage: adapter.homepage };
	const cacheFile = path.join(SOURCE_CACHE_DIR, `${adapter.id}.json`);
	if (!isEnabled(adapter)) {
		return { status: { ...base, state: 'disabled', count: 0, message: adapter.flagReason }, events: [] };
	}
	const runLive = !only || only.includes(adapter.id);
	if (runLive) {
		const http = createHttp({ cacheDir: HTTP_CACHE_DIR, offline, cacheTtlMs: offline ? undefined : 3 * 3600_000, log: (m) => log(`  [http] ${m}`) });
		const started = Date.now();
		try {
			const events = await withTimeout(
				adapter.fetch({ http, now, horizonDays: HORIZON_DAYS, log: (m) => log(`  [${adapter.id}] ${m}`) }),
				ADAPTER_TIMEOUT_MS,
				adapter.id
			);
			const fetchedAt = new Date().toISOString();
			if (events.length > 0) {
				await mkdir(SOURCE_CACHE_DIR, { recursive: true });
				await writeFile(cacheFile, JSON.stringify({ fetchedAt, events } satisfies CachedSource));
			}
			log(`✓ ${adapter.id}: ${events.length} events (${Math.round((Date.now() - started) / 1000)} s)`);
			if (events.length > 0) return { status: { ...base, state: 'ok', count: events.length, fetchedAt }, events };
		} catch (error) {
			log(`✗ ${adapter.id}: ${(error as Error).message}`);
		}
	}
	const cached = await readJson<CachedSource>(cacheFile);
	if (cached && now.getTime() - Date.parse(cached.fetchedAt) < CACHE_MAX_AGE_MS) {
		log(`↺ ${adapter.id}: using cache from ${cached.fetchedAt} (${cached.events.length} events)`);
		return { status: { ...base, state: 'cached', count: cached.events.length, fetchedAt: cached.fetchedAt }, events: cached.events };
	}
	return { status: { ...base, state: runLive ? 'failed' : 'cached', count: 0, message: runLive ? 'No events and no recent cache' : 'Not run' }, events: [] };
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let next = 0;
	const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
		while (next < items.length) {
			const index = next++;
			results[index] = await fn(items[index]);
		}
	});
	await Promise.all(workers);
	return results;
}

/** List record: drops detail-only fields and keeps the first few show times. */
function toCore(event: EventItem): EventCore {
	const core: Record<string, unknown> = { ...event };
	for (const key of DETAIL_KEYS) delete core[key];
	if (event.times) core.times = event.times.slice(0, CORE_TIMES);
	const sourceCount = new Set(event.sources.map((s) => s.id)).size;
	if (sourceCount > 1) core.src = sourceCount;
	return core as EventCore;
}

function toDetail(event: EventItem): EventDetail {
	const detail: Record<string, unknown> = {};
	for (const key of [...DETAIL_KEYS, 'times'] as const) if (event[key] !== undefined) detail[key] = event[key];
	return detail as EventDetail;
}

/**
 * Many sources give only a town. When another source gave exact coordinates for
 * the same venue in the same town, reuse them so distance and apkaime are real.
 */
function propagateVenueCoords(events: EventItem[]): EventItem[] {
	const key = (event: EventItem) => (event.venue ? `${fold(event.venue)}|${event.town}` : undefined);
	const known = new Map<string, Pick<EventItem, 'lat' | 'lng' | 'apkaime'>>();
	for (const event of events) {
		const k = key(event);
		if (k && !event.approx && event.lat !== undefined && !known.has(k)) known.set(k, { lat: event.lat, lng: event.lng, apkaime: event.apkaime });
	}
	return events.map((event) => {
		const k = key(event);
		const match = event.approx && k ? known.get(k) : undefined;
		if (!match) return event;
		const { approx: _approx, ...rest } = event;
		return { ...rest, lat: match.lat, lng: match.lng, ...(match.apkaime ? { apkaime: match.apkaime } : {}) };
	});
}

function inWindow(event: EventItem, now: Date): boolean {
	return eventEndMs(event) >= now.getTime() - PAST_GRACE_MS && Date.parse(event.start) <= now.getTime() + HORIZON_DAYS * 86_400_000;
}

async function main(): Promise<void> {
	const now = new Date();
	const adapters = await loadAdapters();
	log(`Running ${adapters.length} adapters${offline ? ' (offline)' : ''}…`);
	const results = await mapLimit(adapters, CONCURRENCY, (adapter) => runAdapter(adapter, now));

	const normalized: EventItem[] = [];
	let dropped = 0;
	results.forEach(({ status, events }) => {
		for (const raw of events) {
			const item = normalize(raw, { sourceName: status.name, now });
			if (item && inWindow(item, now)) normalized.push(item);
			else dropped++;
		}
	});
	const { events: deduped, merged } = dedupe(propagateVenueCoords(normalized));
	const events = propagateVenueCoords(deduped).sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id));

	const previous = await readJson<EventItem[]>(path.join(OUT_DIR, 'events.json'));
	const previousActive = (previous ?? []).filter((event) => inWindow(event, now));
	if (previousActive.length > 0 && events.length < previousActive.length * MIN_KEEP_RATIO) {
		log(`! Only ${events.length} events against ${previousActive.length} before. Keeping the previous file.`);
		process.exitCode = 2;
		return;
	}

	const meta: DataMeta = { generatedAt: now.toISOString(), count: events.length, sources: results.map((r) => r.status) };
	await mkdir(path.join(OUT_DIR, 'details'), { recursive: true });
	await writeFile(path.join(OUT_DIR, 'events.json'), JSON.stringify(events.map(toCore)));
	const shards: Array<Record<string, EventDetail>> = Array.from({ length: DETAIL_SHARDS }, () => ({}));
	for (const event of events) shards[shardOf(event.id)][event.id] = toDetail(event);
	await Promise.all(shards.map((shard, index) => writeFile(path.join(OUT_DIR, 'details', `${index}.json`), JSON.stringify(shard))));
	await writeFile(path.join(OUT_DIR, 'meta.json'), JSON.stringify(meta, null, 1));

	const byState = results.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.status.state]: (acc[r.status.state] ?? 0) + 1 }), {});
	log(`\n${events.length} events written (${merged} merged duplicates, ${dropped} dropped). Sources: ${JSON.stringify(byState)}`);
}

await main();
