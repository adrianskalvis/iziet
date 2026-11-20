import type { RawEvent } from '../../../src/lib/shared/types';
import type { AdapterContext } from '../types';
import { dayStamp, inWindow, uniqueBySourceId } from '../regional-venues/common';
import { lastPageIndex, mergeDailyEntries, parseCalendar, type Municipality } from './parse';

const CALENDAR_PATH = '/lv/notikumu-kalendars';
const LIVE_TIMEOUT_MS = 10_000;
const ARCHIVE_TIMEOUT_MS = 30_000;
const MAX_LIVE_PAGES = 15;
const DAY_MS = 86_400_000;

/**
 * All platform hosts share one IP. After the first network failure the live path is skipped
 * for the rest of the process, so 24 adapters do not wait for the same timeout 24 times.
 */
let platformDown = false;

export function resetPlatformState(): void {
	platformDown = false;
}

interface WaybackAvailability {
	archived_snapshots?: { closest?: { available?: boolean; timestamp?: string; status?: string } };
}

function startedAfterHorizon(events: RawEvent[], limit: number): boolean {
	return events.length > 0 && events.every((event) => Date.parse(event.start) > limit);
}

async function fetchLive(muni: Municipality, ctx: AdapterContext): Promise<RawEvent[]> {
	const base = `https://${muni.host}${CALENDAR_PATH}`;
	const limit = ctx.now.getTime() + ctx.horizonDays * DAY_MS;
	const first = await ctx.http.text(base, { timeoutMs: LIVE_TIMEOUT_MS });
	const events = parseCalendar(first, muni, base);
	const lastPage = Math.min(lastPageIndex(first), MAX_LIVE_PAGES - 1);
	let previous = events;
	for (let page = 1; page <= lastPage && !startedAfterHorizon(previous, limit); page++) {
		const html = await ctx.http.text(`${base}?page=${page}`, { timeoutMs: LIVE_TIMEOUT_MS });
		previous = parseCalendar(html, muni, base);
		if (previous.length === 0) break;
		events.push(...previous);
	}
	return events;
}

async function fetchArchive(muni: Municipality, ctx: AdapterContext): Promise<RawEvent[]> {
	const base = `https://${muni.host}${CALENDAR_PATH}`;
	const lookup = `https://archive.org/wayback/available?url=${muni.host}${CALENDAR_PATH}&timestamp=${dayStamp(ctx.now)}`;
	const availability = await ctx.http.json<WaybackAvailability>(lookup, { timeoutMs: ARCHIVE_TIMEOUT_MS });
	const snapshot = availability.archived_snapshots?.closest;
	if (!snapshot?.available || !snapshot.timestamp || snapshot.status !== '200') {
		ctx.log(`${muni.host}: no archived snapshot`);
		return [];
	}
	const html = await ctx.http.text(`https://web.archive.org/web/${snapshot.timestamp}id_/${base}`, {
		timeoutMs: ARCHIVE_TIMEOUT_MS
	});
	ctx.log(`archived snapshot ${snapshot.timestamp}`);
	return parseCalendar(html, muni, base);
}

/** Live calendar first, Wayback snapshot of the list page when the live site fails. */
export async function fetchMunicipality(muni: Municipality, ctx: AdapterContext): Promise<RawEvent[]> {
	let events: RawEvent[] | undefined;
	if (platformDown) {
		ctx.log(`${muni.host}: live platform marked down in this run, using archive`);
	} else {
		try {
			events = await fetchLive(muni, ctx);
		} catch (error) {
			platformDown = true;
			ctx.log(`${muni.host}: live fetch failed (${(error as Error).message}), using archive`);
		}
	}
	if (!events) {
		try {
			events = await fetchArchive(muni, ctx);
		} catch (error) {
			ctx.log(`${muni.host}: archive failed (${(error as Error).message}), returning no events`);
			return [];
		}
	}
	const upcoming = uniqueBySourceId(events).filter((event) => inWindow(event, ctx.now, ctx.horizonDays));
	const kept = mergeDailyEntries(upcoming);
	if (events.length > 0 && kept.length === 0) ctx.log(`${muni.host}: ${events.length} events found, none upcoming`);
	return kept;
}
