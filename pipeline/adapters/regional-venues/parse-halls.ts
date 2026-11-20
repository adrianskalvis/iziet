import type { RawEvent } from '../../../src/lib/shared/types';
import { rigaIso, toRigaIso } from '../../../src/lib/shared/time';
import { inferYear, monthFromWord, parseTime } from '../../lib/dates';
import { absoluteUrl, cheerio, cleanText } from '../../lib/html';
import { parsePrice } from '../../lib/price';
import { cleanDescription, cleanTitle, monthFromShort, priceFromText, sellerFor } from './common';

/** Parsers for concert halls and theatres: Lielais dzintars, GORS, Cēsis, Valmieras teātris. */

const LIELAIS_DZINTARS = {
	venue: 'Koncertzāle Lielais dzintars',
	address: 'Otaņķu iela 1/3, Liepāja',
	lat: 56.511606,
	lng: 21.01086
};

/** Lielais dzintars: month page ?year=Y&month=M. Dates carry no year, the page month gives it. */
export function parseLielaisDzintars(html: string, pageYear: number, pageMonth: number, base: string): RawEvent[] {
	const $ = cheerio.load(html);
	const events: RawEvent[] = [];
	$('.related-events').each((_, el) => {
		const node = $(el);
		const link = node.find('.event-info h2 a').first();
		const title = cleanTitle(link.text());
		const url = absoluteUrl(link.attr('href'), base);
		if (!title || !url) return;

		const dateLines = (node.find('.event-time h4').first().html() ?? '').replace(/<span[^>]*>.*$/s, '').split(/<br\s*\/?>/i);
		const dateText = cleanText(cheerio.load(`<p>${dateLines[0] ?? ''}</p>`).text());
		const timeText = cleanText(cheerio.load(`<p>${dateLines[1] ?? ''}</p>`).text());
		const dates = [...dateText.matchAll(/(\d{1,2})\.\s*([\p{L}]+)/gu)].map((m) => ({ day: Number(m[1]), month: monthFromWord(m[2]) }));
		if (dates.length === 0 || !dates[0].month) return;
		const first = dates[0];
		const startYear = first.month! > pageMonth + 6 ? pageYear - 1 : pageYear;
		const time = parseTime(timeText);
		const start = time
			? rigaIso(startYear, first.month!, first.day, time.hour, time.minute)
			: rigaIso(startYear, first.month!, first.day);
		let end: string | undefined;
		const last = dates[dates.length - 1];
		if (dates.length > 1 && last.month) {
			const endYear = last.month < first.month! ? startYear + 1 : startYear;
			end = rigaIso(endYear, last.month, last.day, 23, 59);
		}

		const statusText = cleanText(node.find('.event-status').first().text());
		const priceText = cleanText(node.find('.event-ticket strong').first().text());
		const ticketHref = absoluteUrl(node.find('a.btn[target="_blank"]').first().attr('href'), base);
		const hall = cleanText(node.find('.event-hall').first().text());
		const organizer = cleanText(node.find('.event-info p.txt-small').first().text());
		const price = priceFromText(priceText);

		events.push({
			source: 'lielais-dzintars',
			sourceId: url.replace(/^https?:\/\/[^/]+/, '') + '@' + start.slice(0, 16),
			url,
			title,
			start,
			end,
			allDay: time ? undefined : true,
			venueName: hall ? `${LIELAIS_DZINTARS.venue}, ${hall.split('|')[0].trim()}` : LIELAIS_DZINTARS.venue,
			address: LIELAIS_DZINTARS.address,
			town: 'Liepāja',
			lat: LIELAIS_DZINTARS.lat,
			lng: LIELAIS_DZINTARS.lng,
			priceMin: price.priceMin,
			priceMax: price.priceMax,
			free: /bezmaksas/i.test(statusText) ? true : price.free,
			tickets: ticketHref ? [{ seller: sellerFor(ticketHref), url: ticketHref }] : undefined,
			image: absoluteUrl(node.find('.related-event-image img').first().attr('src'), base),
			organizer: organizer && organizer !== 'Lielais dzintars' ? organizer : undefined,
			status: /atcelts/i.test(statusText) ? 'cancelled' : /pārcelts/i.test(statusText) ? 'postponed' : undefined,
			lang: ['lv']
		});
	});
	return events;
}

/** GORS (Rēzekne): month page /lv/events/YYYY-MM on biletes.latgalesgors.lv. */
export function parseGors(html: string, pageYear: number, pageMonth: number, base: string): RawEvent[] {
	const $ = cheerio.load(html);
	const events: RawEvent[] = [];
	$('.view-content > div').each((_, el) => {
		const node = $(el);
		const link = node.find('.wrapper > a').first();
		const title = cleanTitle(link.text());
		const url = absoluteUrl(link.attr('href'), base);
		const day = Number(cleanText(node.find('span.event-block-date').first().text()).replace(/\D/g, ''));
		const month = monthFromShort(node.find('span.event-block-month').first().text()) ?? pageMonth;
		if (!title || !url || !day) return;
		const time = parseTime(node.find('span.event-block-time').first().text());
		const start = time ? rigaIso(pageYear, month, day, time.hour, time.minute) : rigaIso(pageYear, month, day);

		const ticketHref = absoluteUrl(node.find('a.event-ticket-buy[target="_blank"]').first().attr('href'), base);
		const soldOut = /izpārdotas/i.test(node.find('span.event-tickets-sold').first().text());
		events.push({
			source: 'gors',
			sourceId: url.replace(/^https?:\/\/[^/]+/, '') + '@' + start.slice(0, 16),
			url,
			title,
			description: cleanDescription(node.find('.field-body').first().text()),
			start,
			allDay: time ? undefined : true,
			venueName: 'Latgales vēstniecība GORS',
			address: 'Atbrīvošanas aleja 102, Rēzekne',
			town: 'Rēzekne',
			tickets: ticketHref ? [{ seller: sellerFor(ticketHref), url: ticketHref }] : undefined,
			image: absoluteUrl(node.find('img.img-responsive').first().attr('src'), base),
			status: soldOut ? 'soldout' : undefined,
			lang: ['lv']
		});
	});
	return events;
}

export interface SitemapEntry {
	url: string;
	lastmod: string;
}

/** Cēsis sitemap: event page URLs with lastmod, newest first, duplicates removed. */
export function parseCesisSitemap(xml: string, maxAgeDays: number, now: Date): SitemapEntry[] {
	const cutoff = now.getTime() - maxAgeDays * 86_400_000;
	const seen = new Set<string>();
	const entries: SitemapEntry[] = [];
	for (const match of xml.matchAll(/<loc>([^<]*\/pasakumi\/[^<]+)<\/loc>\s*<lastmod>([^<]*)<\/lastmod>/g)) {
		const [, url, lastmod] = match;
		if (seen.has(url) || !(Date.parse(lastmod) >= cutoff)) continue;
		seen.add(url);
		entries.push({ url, lastmod });
	}
	return entries.sort((a, b) => Date.parse(b.lastmod) - Date.parse(a.lastmod));
}

const WEEKDAY_STEMS: Array<[RegExp, number]> = [
	[/^pirmdien/, 1],
	[/^otrdien/, 2],
	[/^trešdien/, 3],
	[/^ceturtdien/, 4],
	[/^piektdien/, 5],
	[/^sestdien/, 6],
	[/^svētdien/, 0]
];

/** Year of the nearest date to `now` that falls on the given weekday. */
export function yearFromWeekday(day: number, month: number, weekday: number, now: Date): number | undefined {
	const nowYear = now.getUTCFullYear();
	const matches = [nowYear - 1, nowYear, nowYear + 1, nowYear + 2].filter(
		(year) => new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay() === weekday
	);
	const distance = (year: number) => Math.abs(Date.UTC(year, month - 1, day, 12) - now.getTime());
	return matches.sort((a, b) => distance(a) - distance(b))[0];
}

/**
 * Reads "23. janvāris, sestdiena - 18:00, 2027". Without a year, the weekday picks it:
 * "13. novembris, piektdiena - 19:00" is a Friday, so 2026.
 */
export function parseCesisDate(
	text: string,
	now: Date = new Date()
): { year: number; month: number; day: number; hour?: number; minute?: number } | undefined {
	const clean = cleanText(text);
	const date = clean.match(/(\d{1,2})\.\s*([\p{L}]+)/u);
	const month = date ? monthFromWord(date[2]) : undefined;
	if (!date || !month) return undefined;
	const day = Number(date[1]);
	const explicitYear = clean.match(/\b(20\d{2})\b/);
	const weekdayWord = clean.match(/\b(pirmdien\w*|otrdien\w*|trešdien\w*|ceturtdien\w*|piektdien\w*|sestdien\w*|svētdien\w*)/iu)?.[1];
	const weekday = weekdayWord ? WEEKDAY_STEMS.find(([pattern]) => pattern.test(weekdayWord.toLowerCase()))?.[1] : undefined;
	const year = explicitYear
		? Number(explicitYear[1])
		: weekday !== undefined
			? yearFromWeekday(day, month, weekday, now)
			: inferYear(month, day, now);
	if (!year) return undefined;
	const time = parseTime(clean.replace(/\b20\d{2}\b/, ''));
	return { year, month, day, hour: time?.hour, minute: time?.minute };
}

/** One Cēsis event page. */
export function parseCesisEvent(html: string, pageUrl: string, now: Date = new Date()): RawEvent | undefined {
	const $ = cheerio.load(html);
	const title = cleanTitle($('.text-block h3').first().text());
	const when = parseCesisDate($('.text-block h5').first().text(), now);
	if (!title || !when) return undefined;
	const start =
		when.hour === undefined
			? rigaIso(when.year, when.month, when.day)
			: rigaIso(when.year, when.month, when.day, when.hour, when.minute ?? 0);
	const ticketHref = absoluteUrl($('.text-block a.primary-btn').first().attr('href'), pageUrl);
	const image = $('img.event-picture-image').first().attr('src') ?? $('meta[property="og:image"]').attr('content');
	return {
		source: 'cesis-koncertzale',
		sourceId: new URL(pageUrl).pathname,
		url: pageUrl,
		title,
		description: cleanDescription($('.event-body .rich-content').first().html()),
		start,
		allDay: when.hour === undefined ? true : undefined,
		venueName: 'Koncertzāle Cēsis',
		address: 'Raunas iela 12, Cēsis',
		town: 'Cēsis',
		tickets: ticketHref ? [{ seller: sellerFor(ticketHref), url: ticketHref }] : undefined,
		image: absoluteUrl(image, pageUrl),
		lang: ['lv']
	};
}

/** Valmieras teātris: one calendar page with every upcoming show. */
export function parseValmierasTeatris(html: string, base: string): RawEvent[] {
	const $ = cheerio.load(html);
	const events: RawEvent[] = [];
	$('.single-calendar-section').each((_, section) => {
		const node = $(section);
		const year = Number(node.attr('data-year'));
		const month = Number(node.attr('data-month-index') ?? node.attr('data-month'));
		const day = Number(cleanText(node.find('.section-title').first().text()).match(/(\d{1,2})\./)?.[1]);
		if (!year || !month || !day) return;
		node.find('.single-event').each((__, el) => {
			const item = $(el);
			const link = item.find('a.event-title').first();
			const title = cleanTitle(link.text());
			const url = absoluteUrl(link.attr('href'), base);
			const time = parseTime(item.find('.event-time').first().text());
			if (!title || !url) return;
			const start = time ? rigaIso(year, month, day, time.hour, time.minute) : rigaIso(year, month, day);
			const duration = cleanText(item.find('.event-duration').first().text()).match(/(?:(\d+)\s*h)?\s*(?:(\d+)\s*min)?/);
			const minutes = duration ? Number(duration[1] ?? 0) * 60 + Number(duration[2] ?? 0) : 0;
			const end = time && minutes > 0 ? toRigaIso(Date.parse(start) + minutes * 60_000) : undefined;
			const hall = cleanText(item.find('.hall-badge').first().text());
			const price = parsePrice(cleanText(item.find('.single-event-row').first().text()).replace(/^Biļetes:\s*/i, ''));
			const ticketHref = absoluteUrl(item.find('a.tickets-button').first().attr('href'), base);
			const thumb = item.find('.event-image img').first().attr('src');
			events.push({
				source: 'valmieras-teatris',
				sourceId: `${item.attr('data-external-id') ?? item.attr('data-id') ?? url}@${start.slice(0, 16)}`,
				url,
				title,
				start,
				end,
				allDay: time ? undefined : true,
				venueName: hall && !/\d/.test(hall) ? `Valmieras Drāmas teātris, ${hall}` : hall ? hall.split(',')[0].trim() : 'Valmieras Drāmas teātris',
				address: /\d/.test(hall) ? hall.split(',').slice(1).join(',').trim() || undefined : 'Lāčplēša iela 4, Valmiera',
				town: 'Valmiera',
				priceMin: price?.min,
				priceMax: price?.max,
				free: price?.free,
				tickets: ticketHref ? [{ seller: sellerFor(ticketHref), url: ticketHref }] : undefined,
				image: absoluteUrl(thumb?.replace(/-\d+x\d+(\.\w+)$/, '$1'), base),
				lang: ['lv'],
				defaultCategory: 'teatris'
			});
		});
	});
	return events;
}
