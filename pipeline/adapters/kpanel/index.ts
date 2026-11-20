import type { RawEvent } from '../../../src/lib/shared/types';
import { dedupeBySourceId, finishEvent, inWindow, RequestBudget } from '../jsonld-sites/common';
import type { Adapter, AdapterContext } from '../types';
import { eventFromEntry, type KpanelSite, listEntries, type ListingEntry, parseKpanelEvent } from './parse';
import { KPANEL_SITES } from './sites';

const MAX_DETAIL_PAGES = 120;

async function fetchKpanel(site: KpanelSite, ctx: AdapterContext): Promise<RawEvent[]> {
	const budget = new RequestBudget(ctx);
	const window = { now: ctx.now, horizonDays: ctx.horizonDays };
	const entries = new Map<string, ListingEntry>();
	const listUrl = `${site.origin}${site.listPath}`;
	const listHtml = await budget.text(listUrl);
	for (const entry of listHtml ? listEntries(listHtml, listUrl) : []) entries.set(entry.url, entry);

	const raw: RawEvent[] = [];
	let fetched = 0;
	for (const entry of entries.values()) {
		const listed = eventFromEntry(entry, site);
		if (listed && !inWindow(listed, window)) continue;
		if (fetched >= MAX_DETAIL_PAGES) {
			if (listed) raw.push(listed);
			continue;
		}
		fetched++;
		const html = await budget.text(entry.url);
		const detailed = html ? parseKpanelEvent(html, entry.url, site, entry) : undefined;
		const event = detailed ?? listed;
		if (event) raw.push(event);
	}
	const events = raw
		.map((event) => finishEvent(event, { town: undefined, lang: ['lv'] }))
		.filter((event): event is RawEvent => !!event && inWindow(event, window));
	ctx.log(`${events.length} events from ${entries.size} listed, ${fetched} pages read`);
	return dedupeBySourceId(events);
}

function buildKpanelAdapter(site: KpanelSite): Adapter {
	return {
		id: site.id,
		name: site.name,
		homepage: site.homepage,
		kind: 'html',
		fetch: (ctx) => fetchKpanel(site, ctx)
	};
}

/** One adapter per KPanel site (visit.jekabpils.lv, visit.bauska.lv), built from sites.ts. */
export default KPANEL_SITES.map(buildKpanelAdapter) satisfies Adapter[];
