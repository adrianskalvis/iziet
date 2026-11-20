import { finishEvent, inWindow, dedupeBySourceId, RequestBudget } from '../jsonld-sites/common';
import type { Adapter } from '../types';
import type { RawEvent } from '../../../src/lib/shared/types';
import { type IcalSite, parseIcalFeed } from './parse';
import { ICAL_SITES } from './sites';

function buildIcalAdapter(site: IcalSite): Adapter {
	return {
		id: site.id,
		name: site.name,
		homepage: site.homepage,
		kind: 'feed',
		defaultCategory: undefined,
		async fetch(ctx) {
			const budget = new RequestBudget(ctx);
			const text = await budget.text(site.feedUrl);
			if (!text) return [];
			const window = { now: ctx.now, horizonDays: ctx.horizonDays, maxSpanDays: site.maxSpanDays };
			const events = parseIcalFeed(text, site)
				.map((event) => finishEvent(event, { town: undefined, lang: site.lang, keepUpper: site.keepUpper, defaultCategory: site.defaultCategory }))
				.filter((event): event is RawEvent => !!event && inWindow(event, window));
			ctx.log(`${events.length} events in window`);
			return dedupeBySourceId(events);
		}
	};
}

/** One adapter per iCalendar feed, built from the config list in sites.ts. */
export default ICAL_SITES.map(buildIcalAdapter) satisfies Adapter[];
