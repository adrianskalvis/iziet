import { rigaDayKey } from '../../../src/lib/shared/time';
import type { RawEvent } from '../../../src/lib/shared/types';
import { dedupeBySourceId, finishEvent, inWindow, RequestBudget } from '../jsonld-sites/common';
import type { Adapter } from '../types';
import { parseTecResponse, type TecResponse, type TecSite } from './parse';
import { TEC_SITES } from './sites';

const PER_PAGE = 50;
const MAX_PAGES = 8;
const DAY_MS = 86_400_000;

function firstPageUrl(site: TecSite, now: Date, horizonDays: number): string {
	const params = new URLSearchParams({
		per_page: String(PER_PAGE),
		start_date: rigaDayKey(now),
		end_date: rigaDayKey(new Date(now.getTime() + horizonDays * DAY_MS))
	});
	return `${site.apiUrl}?${params}`;
}

function buildTecAdapter(site: TecSite): Adapter {
	return {
		id: site.id,
		name: site.name,
		homepage: site.homepage,
		kind: 'api',
		defaultCategory: site.defaultCategory,
		async fetch(ctx) {
			const budget = new RequestBudget(ctx);
			const raw: RawEvent[] = [];
			let url: string | undefined = firstPageUrl(site, ctx.now, ctx.horizonDays);
			for (let page = 0; url && page < MAX_PAGES; page++) {
				const response: TecResponse | undefined = await budget.json<TecResponse>(url);
				if (!response) break;
				raw.push(...parseTecResponse(response, site));
				url = response.next_rest_url;
			}
			const window = { now: ctx.now, horizonDays: ctx.horizonDays };
			const events = raw
				.map((event) => finishEvent(event, { defaultCategory: site.defaultCategory, lang: site.lang }))
				.filter((event): event is RawEvent => !!event && inWindow(event, window));
			ctx.log(`${events.length} events from ${raw.length} entries`);
			return dedupeBySourceId(events);
		}
	};
}

/** One adapter per The Events Calendar site, built from the config list in sites.ts. */
export default TEC_SITES.map(buildTecAdapter) satisfies Adapter[];
