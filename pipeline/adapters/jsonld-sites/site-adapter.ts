import type { RawEvent } from '../../../src/lib/shared/types';
import { cheerio } from '../../lib/html';
import type { Adapter, AdapterContext } from '../types';
import { dedupeBySourceId, finishEvent, inWindow, RequestBudget } from './common';
import { eventsFromHtml, type JsonLdSite, type ListingItem, listingTargets, mergeEvent, moveEvent } from './parse';

const DEFAULT_MAX_DETAIL_PAGES = 120;
const DAY_MS = 86_400_000;

/** A RawEvent built from listing data alone, when the event page is missing or over the cap. */
function eventFromHint(site: JsonLdSite, item: ListingItem): RawEvent | undefined {
	const hint = item.event;
	if (!hint?.title || !hint.start) return undefined;
	return { ...hint, source: site.id, sourceId: `${item.url}#${hint.start}`, url: item.url, title: hint.title, start: hint.start };
}

export async function runJsonLdSite(site: JsonLdSite, ctx: AdapterContext): Promise<RawEvent[]> {
	const budget = new RequestBudget(ctx);
	const window = { now: ctx.now, horizonDays: ctx.horizonDays, maxSpanDays: site.maxSpanDays };
	const horizonMs = ctx.now.getTime() + ctx.horizonDays * DAY_MS;
	const collected: RawEvent[] = [];
	const targets = new Map<string, ListingItem>();

	const listingUrls = typeof site.listingUrls === 'function' ? site.listingUrls(ctx.now, ctx.horizonDays) : site.listingUrls;
	for (const listingUrl of listingUrls) {
		const seen = new Set<string>();
		let url: string | undefined = listingUrl;
		while (url && seen.size < (site.maxListingPages ?? 1) && !seen.has(url)) {
			seen.add(url);
			const html = await budget.text(url);
			if (!html) break;
			if (site.mode === 'listing') {
				collected.push(...eventsFromHtml(html, url, site));
			} else {
				const items = listingTargets(html, url, site, ctx.now);
				const fresh = items.filter((item) => !targets.has(item.url));
				for (const item of items) targets.set(item.url, targets.get(item.url) ?? item);
				const allBeyond = items.length > 0 && items.every((item) => item.event?.start && Date.parse(item.event.start) >= horizonMs);
				if (fresh.length === 0 || allBeyond) break;
			}
			url = site.nextPage?.(cheerio.load(html), url);
		}
	}

	if (site.mode === 'detail') collected.push(...(await fetchDetails(site, ctx, budget, targets, window)));

	const finished = collected
		.map((event) =>
			finishEvent(event, {
				town: site.town,
				townIsFallback: site.townIsFallback,
				defaultCategory: site.defaultCategory,
				lang: site.lang,
				keepUpper: site.keepUpper,
				skipTitle: site.skipTitle
			})
		)
		.filter((event): event is RawEvent => !!event && inWindow(event, window));
	const events = dedupeBySourceId(finished);
	ctx.log(`${events.length} events from ${collected.length} candidates, ${budget.remaining} requests left`);
	return events;
}

async function fetchDetails(
	site: JsonLdSite,
	ctx: AdapterContext,
	budget: RequestBudget,
	targets: Map<string, ListingItem>,
	window: { now: Date; horizonDays: number; maxSpanDays?: number }
): Promise<RawEvent[]> {
	const cap = site.maxDetailPages ?? DEFAULT_MAX_DETAIL_PAGES;
	const detailSite: JsonLdSite = { ...site, urlIsPage: true };
	const templates = new Map<string, RawEvent>();
	const out: RawEvent[] = [];
	let fetched = 0;
	const fallback = (item: ListingItem) => {
		const event = eventFromHint(site, item);
		if (event) out.push(event);
	};

	for (const item of targets.values()) {
		const hint = item.event;
		if (hint?.start && !inWindow({ start: hint.start, end: hint.end, allDay: hint.allDay }, window)) continue;
		const group = site.detailGroup?.(item.url);
		const template = group ? templates.get(group) : undefined;
		if (template && hint?.start) {
			out.push(mergeEvent(moveEvent(template, hint.start, item.url), hint));
			continue;
		}
		if (fetched >= cap) {
			fallback(item);
			continue;
		}
		fetched++;
		const html = await budget.text(item.url);
		const events = html ? eventsFromHtml(html, item.url, detailSite) : [];
		if (events.length === 0) {
			fallback(item);
			continue;
		}
		const merged = events.map((event) => mergeEvent(event, hint));
		out.push(...merged);
		if (group) templates.set(group, merged[0]);
	}
	if (fetched >= cap) ctx.log(`detail page cap of ${cap} reached, rest from listing data`);
	return out;
}

export function buildJsonLdAdapter(site: JsonLdSite): Adapter {
	return {
		id: site.id,
		name: site.name,
		homepage: site.homepage,
		kind: 'html',
		defaultCategory: site.defaultCategory,
		fetch: (ctx) => runJsonLdSite(site, ctx)
	};
}
