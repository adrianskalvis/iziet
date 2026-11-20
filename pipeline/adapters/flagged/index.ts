import type { RawEvent } from '../../../src/lib/shared/types';
import { inWindow, uniqueBySourceId } from '../regional-venues/common';
import type { Adapter, AdapterContext } from '../types';
import {
	BILESUSERVISS_ORIGIN,
	bsCardEvent,
	LATVIA_TRAVEL_ENDPOINT,
	parseBsEventPage,
	parseBsListing,
	parseLtPage,
	parseTicketshopEvent,
	parseTicketshopSitemap,
	TICKETSHOP_ORIGIN,
	type BsCard,
	type LtPage
} from './parse';

/** Requests allowed per adapter run. */
const MAX_REQUESTS = 200;
const MAX_LISTING_PAGES = 22;
const DAY_MS = 86_400_000;

/** Biļešu Serviss: listing pages in date order, then each event page for JSON-LD. */
async function fetchBilesuserviss(ctx: AdapterContext): Promise<RawEvent[]> {
	const limit = ctx.now.getTime() + ctx.horizonDays * DAY_MS;
	const cards = new Map<string, BsCard>();
	let requests = 0;
	for (let page = 1; page <= MAX_LISTING_PAGES && requests < MAX_REQUESTS / 4; page++) {
		const url = `${BILESUSERVISS_ORIGIN}/biletes/visi${page > 1 ? `?page=${page}` : ''}`;
		requests++;
		const found = parseBsListing(await ctx.http.text(url));
		if (found.length === 0) break;
		for (const card of found) cards.set(card.code, card);
		if (found.every((card) => Date.parse(card.start) > limit)) break;
	}
	const upcoming = [...cards.values()].filter((card) => inWindow(bsCardEvent(card), ctx.now, ctx.horizonDays));
	const events: RawEvent[] = [];
	for (const card of upcoming) {
		if (requests >= MAX_REQUESTS) {
			events.push(bsCardEvent(card));
			continue;
		}
		requests++;
		try {
			events.push(parseBsEventPage(await ctx.http.text(card.url), card.url) ?? bsCardEvent(card));
		} catch (error) {
			ctx.log(`${card.url}: ${(error as Error).message}, using listing data`);
			events.push(bsCardEvent(card));
		}
	}
	ctx.log(`${cards.size} listed, ${upcoming.length} upcoming, ${requests} requests`);
	return uniqueBySourceId(events).filter((event) => inWindow(event, ctx.now, ctx.horizonDays));
}

/** latvia.travel: the page's own JSON endpoint, 20 events per page. */
async function fetchLatviaTravel(ctx: AdapterContext): Promise<RawEvent[]> {
	const events: RawEvent[] = [];
	for (let page = 0; page < MAX_REQUESTS; page++) {
		const data = await ctx.http.json<LtPage>(`${LATVIA_TRAVEL_ENDPOINT}?page=${page}`);
		events.push(...parseLtPage(data));
		const next = data.pager?.next_page;
		if (next === undefined || next === null || next <= page) break;
	}
	return uniqueBySourceId(events).filter((event) => inWindow(event, ctx.now, ctx.horizonDays));
}

/** Ticketshop: lv sitemap, then Event JSON-LD on each event page. */
async function fetchTicketshop(ctx: AdapterContext): Promise<RawEvent[]> {
	const urls = parseTicketshopSitemap(await ctx.http.text(`${TICKETSHOP_ORIGIN}/sitemap_lv.xml`)).slice(0, MAX_REQUESTS - 1);
	const events: RawEvent[] = [];
	for (const url of urls) {
		try {
			const event = parseTicketshopEvent(await ctx.http.text(url), url);
			if (event) events.push(event);
		} catch (error) {
			ctx.log(`${url}: ${(error as Error).message}`);
		}
	}
	return uniqueBySourceId(events).filter((event) => inWindow(event, ctx.now, ctx.horizonDays));
}

const adapters: Adapter[] = [
	{
		id: 'bilesuserviss',
		name: 'Biļešu Serviss',
		homepage: 'https://www.bilesuserviss.lv/biletes/visi',
		kind: 'html',
		flag: 'SOURCE_BILESUSERVISS',
		flagReason: 'Terms 5.1 forbid copying data; written permission requested.',
		fetch: fetchBilesuserviss
	},
	{
		id: 'latvia-travel',
		name: 'Latvia.travel',
		homepage: 'https://www.latvia.travel/lv/pasakumi',
		kind: 'api',
		flag: 'SOURCE_LATVIATRAVEL',
		flagReason: 'Terms allow personal non-commercial use; LIAA consent requested.',
		fetch: fetchLatviaTravel
	},
	{
		id: 'ticketshop',
		name: 'Ticketshop',
		homepage: 'https://ticketshop.lv/lv',
		kind: 'html',
		flag: 'SOURCE_TICKETSHOP',
		flagReason: 'Terms 5.2 restrict reuse; permission requested.',
		fetch: fetchTicketshop
	}
];

export default adapters;
