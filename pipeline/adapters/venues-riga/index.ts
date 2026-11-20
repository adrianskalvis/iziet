import type { RawEvent } from '../../../src/lib/shared/types';
import { rigaParts } from '../../../src/lib/shared/time';
import type { Adapter, AdapterContext } from '../types';
import { DAY_MS, inferYear, isoFrom, notEnded, withinHorizon } from './common';
import {
	HANZAS_ID,
	HANZAS_LIST,
	hanzasStart,
	parseHanzasDetail,
	parseHanzasList,
	upcomingHanzasItems
} from './hanzas';
import { LNMM_CALENDAR, LNMM_ID, lnmmEvents, parseLnmmCalendar } from './lnmm';
import { MEZAPARKS_HOME, MEZAPARKS_ID, parseMezaparksDetail, parseMezaparksHome } from './mezaparks';
import { OPERA_ID, operaEvents, operaMonthUrl, parseOperaMonth, type OperaEntry } from './opera';
import {
	PALLADIUM_CALENDAR,
	PALLADIUM_ID,
	PALLADIUM_TICKETS,
	cardKey,
	parsePalladiumCards,
	parsePalladiumDetail
} from './palladium';
import { TEATRIS_ID, TEATRIS_REPERTOIRE, parseProduction, parseRepertoire } from './teatris';
import { XIAOMI_HOME, XIAOMI_ID, parseXiaomiDate, parseXiaomiDetail, parseXiaomiHome } from './xiaomi';

/** Months from the current one to the horizon, as [year, month] pairs. */
export function monthsInHorizon(now: Date, horizonDays: number): Array<[number, number]> {
	const first = rigaParts(now);
	const last = rigaParts(new Date(now.getTime() + horizonDays * DAY_MS));
	const months: Array<[number, number]> = [];
	for (let year = first.year, month = first.month; year < last.year || (year === last.year && month <= last.month); ) {
		months.push([year, month]);
		month++;
		if (month > 12) {
			month = 1;
			year++;
		}
	}
	return months;
}

/** Runs one request; a failure is logged and gives undefined so the rest of the run continues. */
async function attempt<T>(ctx: AdapterContext, label: string, task: () => Promise<T>): Promise<T | undefined> {
	try {
		return await task();
	} catch (error) {
		ctx.log(`${label}: ${(error as Error).message}`);
		return undefined;
	}
}

const compact = (events: Array<RawEvent | undefined>): RawEvent[] => events.filter((event): event is RawEvent => !!event);

const xiaomiArena: Adapter = {
	id: XIAOMI_ID,
	name: 'Xiaomi Arēna',
	homepage: 'https://xiaomi-arena.com',
	kind: 'html',
	async fetch(ctx) {
		const items = parseXiaomiHome(await ctx.http.text(XIAOMI_HOME));
		const events: Array<RawEvent | undefined> = [];
		for (const item of items) {
			const date = parseXiaomiDate(item.dateText, ctx.now);
			if (date) {
				const day = isoFrom(date.year, date.month, date.day);
				if (!notEnded(day, isoFrom(date.year, date.month, date.day, { hour: 23, minute: 59 }), ctx.now)) continue;
				if (!withinHorizon(day, ctx.now, ctx.horizonDays)) continue;
			}
			const html = await attempt(ctx, item.url, () => ctx.http.text(item.url));
			if (html) events.push(parseXiaomiDetail(html, item, ctx.now, ctx.horizonDays));
		}
		return compact(events);
	}
};

const palladium: Adapter = {
	id: PALLADIUM_ID,
	name: 'Palladium Rīga',
	homepage: 'https://www.palladium.lv',
	kind: 'html',
	defaultCategory: 'koncerti',
	async fetch(ctx) {
		const calendar = parsePalladiumCards(await ctx.http.text(PALLADIUM_CALENDAR));
		const tickets = new Map(
			parsePalladiumCards(await ctx.http.text(PALLADIUM_TICKETS)).map((card) => [cardKey(card), card])
		);
		const events: Array<RawEvent | undefined> = [];
		for (const card of calendar) {
			if (!card.href) continue;
			const start = isoFrom(inferYear(card.month, card.day, ctx.now), card.month, card.day);
			if (!withinHorizon(start, ctx.now, ctx.horizonDays)) continue;
			const html = await attempt(ctx, card.href, () => ctx.http.text(card.href as string));
			if (html) {
				events.push(parsePalladiumDetail(html, card, tickets.get(cardKey(card)), card.href, ctx.now, ctx.horizonDays));
			}
		}
		return compact(events);
	}
};

const hanzasPerons: Adapter = {
	id: HANZAS_ID,
	name: 'Hanzas Perons',
	homepage: 'https://hanzasperons.lv',
	kind: 'html',
	async fetch(ctx) {
		const upcoming = upcomingHanzasItems(parseHanzasList(await ctx.http.text(HANZAS_LIST)), ctx.now, ctx.horizonDays);
		const byUrl = new Map<string, typeof upcoming>();
		for (const item of upcoming) byUrl.set(item.url, [...(byUrl.get(item.url) ?? []), item]);
		const events: RawEvent[] = [];
		for (const [url, dates] of byUrl) {
			const ordered = [...dates].sort((a, b) => Date.parse(hanzasStart(a)) - Date.parse(hanzasStart(b)));
			const html = await attempt(ctx, url, () => ctx.http.text(url));
			if (!html) continue;
			const event = parseHanzasDetail(html, ordered[0]);
			events.push({ ...event, occurrences: ordered.slice(1, 21).map(hanzasStart) });
		}
		return events;
	}
};

const mezaparks: Adapter = {
	id: MEZAPARKS_ID,
	name: 'Mežaparka Lielā estrāde',
	homepage: 'https://estrade.riga.lv',
	kind: 'html',
	async fetch(ctx) {
		const urls = parseMezaparksHome(await ctx.http.text(MEZAPARKS_HOME));
		const events: Array<RawEvent | undefined> = [];
		for (const url of urls) {
			const html = await attempt(ctx, url, () => ctx.http.text(url));
			if (html) events.push(parseMezaparksDetail(html, url, ctx.now, ctx.horizonDays));
		}
		const found = compact(events);
		if (found.length === 0) {
			ctx.log('mezaparks: no upcoming events on the home page; the full calendar needs a POST to admin-ajax.php, not called');
		}
		return found;
	}
};

const opera: Adapter = {
	id: OPERA_ID,
	name: 'Latvijas Nacionālā opera un balets',
	homepage: 'https://www.opera.lv',
	kind: 'html',
	async fetch(ctx) {
		const entries: OperaEntry[] = [];
		for (const [year, month] of monthsInHorizon(ctx.now, ctx.horizonDays)) {
			const html = await attempt(ctx, `opera ${year}-${month}`, () => ctx.http.text(operaMonthUrl(year, month)));
			if (html) entries.push(...parseOperaMonth(html, year, month));
		}
		return operaEvents(entries, ctx.now, ctx.horizonDays);
	}
};

const nacionalaisTeatris: Adapter = {
	id: TEATRIS_ID,
	name: 'Latvijas Nacionālais teātris',
	homepage: 'https://teatris.lv',
	kind: 'html',
	defaultCategory: 'teatris',
	async fetch(ctx) {
		const urls = parseRepertoire(await ctx.http.text(TEATRIS_REPERTOIRE));
		const events: Array<RawEvent | undefined> = [];
		for (const url of urls) {
			const html = await attempt(ctx, url, () => ctx.http.text(url));
			if (html) events.push(parseProduction(html, url, ctx.now, ctx.horizonDays));
		}
		return compact(events);
	}
};

const lnmm: Adapter = {
	id: LNMM_ID,
	name: 'Latvijas Nacionālais mākslas muzejs',
	homepage: 'https://lnmm.gov.lv',
	kind: 'html',
	async fetch(ctx) {
		const items = parseLnmmCalendar(await ctx.http.text(LNMM_CALENDAR));
		return lnmmEvents(items, ctx.now, ctx.horizonDays);
	}
};

export default [xiaomiArena, palladium, hanzasPerons, mezaparks, opera, nacionalaisTeatris, lnmm] satisfies Adapter[];
