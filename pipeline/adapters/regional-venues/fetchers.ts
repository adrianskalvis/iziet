import type { RawEvent } from '../../../src/lib/shared/types';
import { rigaParts } from '../../../src/lib/shared/time';
import type { AdapterContext } from '../types';
import { inWindow, uniqueBySourceId } from './common';
import {
	dobeleEvent,
	latgaleEvent,
	parseCesisEvent,
	parseCesisSitemap,
	parseDobeleDetail,
	parseDobeleList,
	parseGors,
	parseJelgava,
	parseLatgaleDetail,
	parseLatgaleList,
	parseLielaisDzintars,
	parseTalsi,
	parseTukumsDetail,
	parseTukumsList,
	parseValmierasTeatris,
	tukumsEvent
} from './parse';

/** Requests allowed per adapter run. */
export const MAX_REQUESTS = 200;
const MAX_MONTHS = 5;
const CESIS_SITEMAP_MAX_AGE_DAYS = 400;
const MAX_LIST_PAGES = 8;

interface Month {
	year: number;
	month: number;
}

/** Calendar months from the current one until the end of the horizon, at most MAX_MONTHS. */
export function monthsAhead(ctx: AdapterContext): Month[] {
	const today = rigaParts(ctx.now);
	const last = rigaParts(new Date(ctx.now.getTime() + ctx.horizonDays * 86_400_000));
	const months: Month[] = [];
	let { year, month } = today;
	while ((year < last.year || (year === last.year && month <= last.month)) && months.length < MAX_MONTHS) {
		months.push({ year, month });
		month++;
		if (month > 12) {
			month = 1;
			year++;
		}
	}
	return months;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Runs `task` on each item; a failed item is logged and skipped. Stops at the request cap. */
async function eachSafely<T, R>(
	items: T[],
	ctx: AdapterContext,
	label: (item: T) => string,
	task: (item: T) => Promise<R | undefined>
): Promise<R[]> {
	const results: R[] = [];
	for (const item of items) {
		try {
			const value = await task(item);
			if (value !== undefined) results.push(value);
		} catch (error) {
			ctx.log(`${label(item)}: ${(error as Error).message}`);
		}
	}
	return results;
}

function finish(events: RawEvent[], ctx: AdapterContext): RawEvent[] {
	return uniqueBySourceId(events).filter((event) => inWindow(event, ctx.now, ctx.horizonDays));
}

export async function fetchLielaisDzintars(ctx: AdapterContext): Promise<RawEvent[]> {
	const pages = await eachSafely(
		monthsAhead(ctx),
		ctx,
		(m) => `lielais-dzintars ${m.year}-${m.month}`,
		async ({ year, month }) => {
			const url = `https://lielaisdzintars.lv/lv/kalendars?year=${year}&month=${month}`;
			return parseLielaisDzintars(await ctx.http.text(url), year, month, url);
		}
	);
	return finish(pages.flat(), ctx);
}

export async function fetchGors(ctx: AdapterContext): Promise<RawEvent[]> {
	const pages = await eachSafely(
		monthsAhead(ctx),
		ctx,
		(m) => `gors ${m.year}-${m.month}`,
		async ({ year, month }) => {
			const url = `https://biletes.latgalesgors.lv/lv/events/${year}-${pad(month)}`;
			return parseGors(await ctx.http.text(url), year, month, url);
		}
	);
	return finish(pages.flat(), ctx);
}

export async function fetchCesis(ctx: AdapterContext): Promise<RawEvent[]> {
	const xml = await ctx.http.text('https://www.cesukoncertzale.lv/sitemap.xml');
	const entries = parseCesisSitemap(xml, CESIS_SITEMAP_MAX_AGE_DAYS, ctx.now).slice(0, MAX_REQUESTS - 5);
	ctx.log(`${entries.length} recently changed event pages in the sitemap`);
	const events = await eachSafely(
		entries,
		ctx,
		(entry) => entry.url,
		async (entry) => parseCesisEvent(await ctx.http.text(entry.url), entry.url, ctx.now)
	);
	return finish(events, ctx);
}

export async function fetchValmierasTeatris(ctx: AdapterContext): Promise<RawEvent[]> {
	const url = 'https://valmierasteatris.lv/kalendars/';
	return finish(parseValmierasTeatris(await ctx.http.text(url), url), ctx);
}

export async function fetchDobele(ctx: AdapterContext): Promise<RawEvent[]> {
	const url = 'https://visitdobele.lv/pasakumi';
	const cards = parseDobeleList(await ctx.http.text(url), url);
	const upcoming = cards.filter((card) => inWindow(dobeleEvent(card), ctx.now, ctx.horizonDays)).slice(0, MAX_REQUESTS - 5);
	const events = await eachSafely(
		upcoming,
		ctx,
		(card) => card.url,
		async (card) => {
			try {
				return dobeleEvent(card, parseDobeleDetail(await ctx.http.text(card.url)));
			} catch (error) {
				ctx.log(`${card.url}: detail failed, keeping list data (${(error as Error).message})`);
				return dobeleEvent(card);
			}
		}
	);
	return finish(events, ctx);
}

export async function fetchTukums(ctx: AdapterContext): Promise<RawEvent[]> {
	const first = 'https://visittukums.lv/lv/Pasakumi';
	const firstHtml = await ctx.http.text(first);
	const cards = parseTukumsList(firstHtml, first);
	const lastPage = Math.min(
		Math.max(1, ...[...firstHtml.matchAll(/data-ci-pagination-page="(\d+)"/g)].map((m) => Number(m[1]))),
		MAX_LIST_PAGES
	);
	for (let page = 2; page <= lastPage; page++) {
		try {
			const url = `${first}/${page}`;
			cards.push(...parseTukumsList(await ctx.http.text(url), url));
		} catch (error) {
			ctx.log(`tukums page ${page}: ${(error as Error).message}`);
		}
	}
	const upcoming = cards.filter((card) => inWindow(tukumsEvent(card), ctx.now, ctx.horizonDays)).slice(0, MAX_REQUESTS - 10);
	const events = await eachSafely(
		upcoming,
		ctx,
		(card) => card.url,
		async (card) => {
			try {
				return tukumsEvent(card, parseTukumsDetail(await ctx.http.text(card.url)));
			} catch (error) {
				ctx.log(`${card.url}: detail failed, keeping list data (${(error as Error).message})`);
				return tukumsEvent(card);
			}
		}
	);
	return finish(events, ctx);
}

export async function fetchTalsi(ctx: AdapterContext): Promise<RawEvent[]> {
	const first = 'https://visittalsi.com/pasakumi/';
	const html = await ctx.http.text(first);
	const events = parseTalsi(html, first, ctx.now);
	const lastPage = Math.min(Math.max(1, ...[...html.matchAll(/pasakumi\/page\/(\d+)/g)].map((m) => Number(m[1]))), MAX_LIST_PAGES);
	for (let page = 2; page <= lastPage; page++) {
		try {
			const url = `${first}page/${page}/`;
			events.push(...parseTalsi(await ctx.http.text(url), url, ctx.now));
		} catch (error) {
			ctx.log(`talsi page ${page}: ${(error as Error).message}`);
		}
	}
	return finish(events, ctx);
}

export async function fetchLatgale(ctx: AdapterContext): Promise<RawEvent[]> {
	const cards = (
		await eachSafely(
			monthsAhead(ctx),
			ctx,
			(m) => `latgale ${m.year}-${m.month}`,
			async ({ year, month }) => {
				const url = `https://latgale.travel/notikumi/?be_month=${year}-${pad(month)}`;
				return parseLatgaleList(await ctx.http.text(url), url);
			}
		)
	).flat();
	const byUrl = new Map(cards.map((card) => [card.url, card]));
	const upcoming = [...byUrl.values()]
		.filter((card) => inWindow(latgaleEvent(card), ctx.now, ctx.horizonDays))
		.slice(0, MAX_REQUESTS - MAX_MONTHS);
	const events = await eachSafely(
		upcoming,
		ctx,
		(card) => card.url,
		async (card) => {
			try {
				return latgaleEvent(card, parseLatgaleDetail(await ctx.http.text(card.url)));
			} catch (error) {
				ctx.log(`${card.url}: detail failed, keeping list data (${(error as Error).message})`);
				return latgaleEvent(card);
			}
		}
	);
	return finish(events, ctx);
}

export async function fetchJelgava(ctx: AdapterContext): Promise<RawEvent[]> {
	const url = 'https://www.jelgava.lv/pasakumi/';
	return finish(parseJelgava(await ctx.http.text(url), url), ctx);
}
