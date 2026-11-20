/**
 * Relay for sources whose Cloudflare answers a home connection but refuses
 * GitHub's runners with HTTP 403. `npm run data:relay` fetches them on the
 * owner's computer with the same IzietBot user agent, robots.txt rules and
 * 1 request per second, scrubs contact details, and writes data/relay/<id>.json.
 * The GitHub run uses a relay file when its own fetch fails and the file is
 * newer than its own cache and under 30 days old.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawEvent } from '../src/lib/shared/types';
import { scrubText } from './lib/html';

/** Sources refused on GitHub's runners on 2026-11-21 (HTTP 403 from Cloudflare). */
export const RELAY_SOURCES = ['apollo-kino', 'forum-cinemas', 'lnso', 'saulkrasti', 'dzintari'];

export const RELAY_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data/relay');

export interface SourceResult {
	fetchedAt: string;
	events: RawEvent[];
}

/** Copy of the event with contact details removed from its free-text fields. Relay files are public. */
export function scrubContacts(event: RawEvent): RawEvent {
	return {
		...event,
		...(event.description !== undefined && { description: scrubText(event.description) }),
		...(event.organizer !== undefined && { organizer: scrubText(event.organizer) })
	};
}

const REQUIRED_EVENT_KEYS = ['source', 'sourceId', 'url', 'title', 'start'] as const;

/** Shape check for a cache or relay file read from disk: a valid fetch time and events with their required text fields. */
export function isSourceResult(value: unknown): value is SourceResult {
	if (typeof value !== 'object' || value === null) return false;
	const { fetchedAt, events } = value as Partial<SourceResult>;
	if (typeof fetchedAt !== 'string' || Number.isNaN(Date.parse(fetchedAt)) || !Array.isArray(events)) return false;
	return events.every(
		(event: unknown) =>
			typeof event === 'object' && event !== null && REQUIRED_EVENT_KEYS.every((key) => typeof (event as Record<string, unknown>)[key] === 'string')
	);
}

/** The newest result among those younger than their own age limit, if any. */
export function newestFresh<T extends { fetchedAt: string }>(
	candidates: Array<{ result: T | undefined; maxAgeMs: number }>,
	now: number
): T | undefined {
	return candidates
		.filter(({ result, maxAgeMs }) => result !== undefined && now - Date.parse(result.fetchedAt) < maxAgeMs)
		.map(({ result }) => result as T)
		.reduce<T | undefined>((best, result) => (!best || result.fetchedAt > best.fetchedAt ? result : best), undefined);
}
