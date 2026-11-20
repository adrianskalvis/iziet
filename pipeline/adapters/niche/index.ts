import type { RawEvent } from '../../../src/lib/shared/types';
import type { Adapter, AdapterContext } from '../types';
import {
	BLUSA_ORIGIN,
	BT1_PAGE,
	KALNCIEMS_ORIGIN,
	LEMADE_PAGE,
	blusaToRaw,
	bt1FairToRaw,
	buildKalnciemsEvents,
	lemadeSlotToRaw,
	mergeBlusaDetails,
	parseBlusaMarkets,
	parseBt1Fairs,
	parseDayEntries,
	parseDetail,
	parseEventDays,
	parseLemadeWeek,
	type KalnciemsDetail
} from './parse';
import { addDays, windowFor } from './util';

const DAYS_PER_WEEK = 7;
const MAX_LEMADE_WEEKS = 17;
const MAX_KALNCIEMS_MONTHS = 5;
const MAX_KALNCIEMS_DETAILS = 25;

/** Never fail the whole adapter because one optional page is unreachable. */
async function tryText(ctx: AdapterContext, url: string): Promise<string | undefined> {
	try {
		return await ctx.http.text(url);
	} catch (error) {
		ctx.log(`skipped ${url}: ${(error as Error).message}`);
		return undefined;
	}
}

const blusa: Adapter = {
	id: 'niche-blusa',
	name: 'Blusa.eu tirdziņi',
	homepage: 'https://blusa.eu/markets',
	kind: 'api',
	flag: 'SOURCE_NICHE_BLUSA',
	flagReason:
		'blusa.eu terms page is rendered by script and could not be read; the research list asks for a partner feed first. Enable after written permission.',
	defaultCategory: 'tirdzini',
	async fetch(ctx) {
		const publicList = parseBlusaMarkets(await ctx.http.text(`${BLUSA_ORIGIN}/api/markets/public`));
		const upcomingText = await tryText(ctx, `${BLUSA_ORIGIN}/api/markets/upcoming?limit=50`);
		const markets = mergeBlusaDetails(publicList, upcomingText ? parseBlusaMarkets(upcomingText) : []);
		return markets.map((m) => blusaToRaw(m, ctx.now, ctx.horizonDays)).filter((e): e is RawEvent => !!e);
	}
};

const lemade: Adapter = {
	id: 'niche-lemade',
	name: 'LeMade School keramika',
	homepage: 'https://www.lemade.lv/nodarbibas',
	kind: 'html',
	defaultCategory: 'darbnicas',
	async fetch(ctx) {
		const events: RawEvent[] = [];
		const seen = new Set<string>();
		let url: string | undefined = LEMADE_PAGE;
		const maxWeeks = Math.min(MAX_LEMADE_WEEKS, Math.ceil(ctx.horizonDays / DAYS_PER_WEEK) + 1);
		for (let week = 0; url && week < maxWeeks; week++) {
			const html: string | undefined = week === 0 ? await ctx.http.text(url) : await tryText(ctx, url);
			if (!html) break;
			const parsed = parseLemadeWeek(html);
			for (const slot of parsed.slots) {
				const event = lemadeSlotToRaw(slot, ctx.now, ctx.horizonDays);
				if (event && !seen.has(event.sourceId)) {
					seen.add(event.sourceId);
					events.push(event);
				}
			}
			url = parsed.nextUrl;
		}
		return events;
	}
};

const bt1: Adapter = {
	id: 'niche-bt1',
	name: 'BT 1 izstādes Ķīpsalā',
	homepage: 'https://www.bt1.lv/',
	kind: 'html',
	defaultCategory: 'izstades',
	async fetch(ctx) {
		const fairs = parseBt1Fairs(await ctx.http.text(BT1_PAGE));
		return fairs.map((f) => bt1FairToRaw(f, ctx.now, ctx.horizonDays)).filter((e): e is RawEvent => !!e);
	}
};

function monthUrls(today: string, horizonDays: number): string[] {
	const urls: string[] = [];
	const last = addDays(today, horizonDays).slice(0, 7);
	let cursor = today.slice(0, 7);
	while (cursor <= last && urls.length < MAX_KALNCIEMS_MONTHS) {
		const [year, month] = cursor.split('-').map(Number);
		urls.push(`${KALNCIEMS_ORIGIN}/lv/?month=${month}&year=${year}`);
		cursor = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;
	}
	return urls;
}

const kalnciems: Adapter = {
	id: 'niche-kalnciems',
	name: 'Kalnciema kvartāls',
	homepage: 'https://www.kalnciemaiela.lv/',
	kind: 'html',
	defaultCategory: 'tirdzini',
	async fetch(ctx) {
		const window = windowFor(ctx.now, ctx.horizonDays);
		const days = new Set<string>();
		for (const url of monthUrls(window.today, ctx.horizonDays)) {
			const html = await tryText(ctx, url);
			if (html) for (const day of parseEventDays(html)) if (day >= window.today && day <= window.last) days.add(day);
		}
		const daysByUrl = new Map<string, { title: string; days: string[] }>();
		for (const day of [...days].sort()) {
			const fragment = await tryText(ctx, `${KALNCIEMS_ORIGIN}/inc/events.php?datums=${day}&lang=lv&event=active`);
			if (!fragment) continue;
			for (const entry of parseDayEntries(fragment)) {
				const known = daysByUrl.get(entry.url);
				if (known) known.days.push(day);
				else daysByUrl.set(entry.url, { title: entry.title, days: [day] });
			}
		}
		const details = new Map<string, KalnciemsDetail>();
		for (const url of [...daysByUrl.keys()].slice(0, MAX_KALNCIEMS_DETAILS)) {
			const html = await tryText(ctx, url);
			if (html) details.set(url, parseDetail(html));
		}
		return buildKalnciemsEvents(daysByUrl, details, ctx.now, ctx.horizonDays);
	}
};

export default [blusa, lemade, bt1, kalnciems] satisfies Adapter[];
