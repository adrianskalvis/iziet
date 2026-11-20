import type { RawEvent } from '../../../src/lib/shared/types';
import type { Adapter } from '../types';
import { BASE_URL, listingBeyondHorizon, parseDetail, parseListing, parseListingTotal, type ListingItem } from './parse';

const LISTING_URL = `${BASE_URL}/lv/3-pasakumi`;
/** The brief allows 400 requests for this adapter: listing pages plus detail pages. */
const MAX_REQUESTS = 400;
const PAGE_SIZE = 24;
const MAX_PAGES = 30;

const liveriga: Adapter = {
	id: 'liveriga',
	name: 'Live Riga',
	homepage: BASE_URL,
	kind: 'html',
	async fetch(ctx) {
		let requests = 0;
		const items = new Map<string, ListingItem>();
		let pages = MAX_PAGES;
		// Pages are numbered from 1; page 1 is the bare listing URL.
		for (let page = 1; page <= pages && requests < MAX_REQUESTS; page++) {
			const html = await ctx.http.text(page === 1 ? LISTING_URL : `${LISTING_URL}?page=${page}`);
			requests++;
			const before = items.size;
			for (const item of parseListing(html)) if (!items.has(item.url)) items.set(item.url, item);
			const total = parseListingTotal(html);
			if (total) pages = Math.min(MAX_PAGES, Math.ceil(total / PAGE_SIZE));
			if (items.size === before) break;
		}

		const wanted = [...items.values()].filter((item) => !listingBeyondHorizon(item, ctx.now, ctx.horizonDays));
		ctx.log(`liveriga: ${items.size} listed, ${wanted.length} within the horizon`);

		const events: RawEvent[] = [];
		for (const item of wanted) {
			if (requests >= MAX_REQUESTS) {
				ctx.log(`liveriga: stopped at ${MAX_REQUESTS} requests`);
				break;
			}
			try {
				const html = await ctx.http.text(item.url);
				requests++;
				const event = parseDetail(html, item.url, ctx.now, ctx.horizonDays);
				if (event) events.push(event);
			} catch (error) {
				requests++;
				ctx.log(`liveriga: ${item.url} failed: ${(error as Error).message}`);
			}
		}
		return events;
	}
};

export default liveriga;
