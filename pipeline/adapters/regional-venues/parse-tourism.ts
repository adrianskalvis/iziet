import type { RawEvent } from '../../../src/lib/shared/types';
import { rigaIso } from '../../../src/lib/shared/time';
import { inferYear, parseTime } from '../../lib/dates';
import { absoluteUrl, cheerio, cleanText, htmlToText, truncate } from '../../lib/html';
import { parsePrice } from '../../lib/price';
import {
	cleanDescription,
	cleanTitle,
	MAX_DESCRIPTION,
	priceFromText,
	sellerFor,
	splitVenue,
	stripContacts,
	townFromAddress
} from './common';

/** Parsers for municipal tourism calendars: Dobele, Tukums, Talsi, Latgale, Jelgava. */

interface Clock {
	hour: number;
	minute: number;
}
interface Ymd {
	year: number;
	month: number;
	day: number;
}

const isoOf = (date: Ymd, clock?: Clock): string =>
	clock ? rigaIso(date.year, date.month, date.day, clock.hour, clock.minute) : rigaIso(date.year, date.month, date.day);

// Dobele ------------------------------------------------------------------

export interface DobeleDates {
	start: string;
	end?: string;
	allDay: boolean;
}

/**
 * Reads "19.09.2026 - 01.12.2026", "06.10.2026 08:00 - 27.11.2026", "20.11.2026 18:00 - 20:30",
 * "25.10.2026 11:00 - 22.11.2026 - 14:00" and "28.11.2026 16:00 - 29.11.2026 - 11:00".
 */
export function parseDobeleDates(text: string): DobeleDates | undefined {
	const tokens = cleanText(text).match(/\d{1,2}\.\d{1,2}\.\d{4}|\d{1,2}:\d{2}/g) ?? [];
	const toDate = (token: string | undefined): Ymd | undefined => {
		const m = token?.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
		return m ? { day: Number(m[1]), month: Number(m[2]), year: Number(m[3]) } : undefined;
	};
	const toClock = (token: string | undefined): Clock | undefined => {
		const m = token?.match(/^(\d{1,2}):(\d{2})$/);
		return m ? { hour: Number(m[1]), minute: Number(m[2]) } : undefined;
	};
	const startDate = toDate(tokens[0]);
	if (!startDate) return undefined;
	let index = 1;
	const startClock = toClock(tokens[index]);
	if (startClock) index++;
	const endDate = toDate(tokens[index]);
	if (endDate) index++;
	const endClock = toClock(tokens[index]);
	const lastDate = endDate ?? startDate;
	const end = endDate || endClock ? isoOf(lastDate, endClock ?? (endDate ? { hour: 23, minute: 59 } : undefined)) : undefined;
	return { start: isoOf(startDate, startClock), end, allDay: !startClock };
}

export interface DobeleCard {
	id: string;
	url: string;
	title: string;
	venue?: string;
	image?: string;
	dates: DobeleDates;
}

export function parseDobeleList(html: string, base: string): DobeleCard[] {
	const $ = cheerio.load(html);
	const cards: DobeleCard[] = [];
	$('a.card[href*="/pasakumi/"]').each((_, el) => {
		const node = $(el);
		const url = absoluteUrl(node.attr('href'), base);
		const idMatch = url?.match(/\/pasakumi\/(\d+)\//);
		const dates = parseDobeleDates(node.find('.card-calendar').first().text());
		const titleNode = node.find('.card-title').first().clone();
		const venue = cleanText(titleNode.find('.i-location').text());
		titleNode.find('.i-location').remove();
		const title = cleanTitle(titleNode.text());
		const image = (node.attr('style') ?? '').match(/url\(([^)]+)\)/)?.[1];
		if (!url || !idMatch || !dates || !title) return;
		cards.push({ id: idMatch[1], url, title, venue: venue || undefined, image: absoluteUrl(image, base), dates });
	});
	return cards;
}

/** Description, price and a 600 to 1200 px image from an event page. */
export function parseDobeleDetail(html: string): Partial<RawEvent> {
	const $ = cheerio.load(html);
	const body = $('.obj_saturs').first();
	body.find('img, script, style').remove();
	const text = stripContacts(htmlToText(body.html()));
	const srcset = $('.obj_saturs img').first().attr('srcset') ?? '';
	const candidates = [...srcset.matchAll(/(\S+)\s+(\d+)w/g)].map((m) => ({ url: m[1], width: Number(m[2]) }));
	const image = candidates.filter((c) => c.width >= 600 && c.width <= 1200).sort((a, b) => b.width - a.width)[0];
	const price = priceFromText(text);
	return {
		description: text ? truncate(text, MAX_DESCRIPTION) : undefined,
		image: image?.url,
		priceMin: price.priceMin,
		priceMax: price.priceMax,
		free: price.free
	};
}

export function dobeleEvent(card: DobeleCard, detail: Partial<RawEvent> = {}): RawEvent {
	return {
		source: 'dobele',
		sourceId: card.id,
		url: card.url,
		title: card.title,
		start: card.dates.start,
		end: card.dates.end,
		allDay: card.dates.allDay || undefined,
		venueName: card.venue,
		town: 'Dobele',
		image: card.image,
		lang: ['lv'],
		...Object.fromEntries(Object.entries(detail).filter(([, value]) => value !== undefined))
	};
}

// Tukums ------------------------------------------------------------------

export interface TukumsCard {
	id: string;
	url: string;
	title: string;
	start: string;
	allDay: boolean;
	image?: string;
	excerpt?: string;
}

function parseDotDateTime(text: string): { iso: string; allDay: boolean } | undefined {
	const m = cleanText(text).match(/(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
	if (!m) return undefined;
	const date = { day: Number(m[1]), month: Number(m[2]), year: Number(m[3]) };
	return m[4] ? { iso: isoOf(date, { hour: Number(m[4]), minute: Number(m[5]) }), allDay: false } : { iso: isoOf(date), allDay: true };
}

export function parseTukumsList(html: string, base: string): TukumsCard[] {
	const $ = cheerio.load(html);
	const cards: TukumsCard[] = [];
	$('.article2').each((_, el) => {
		const node = $(el);
		const link = node.find('h3 a').first();
		const url = absoluteUrl(link.attr('href'), base);
		const id = url?.match(/\/Pasakumi\/\d+\/(\d+)/i)?.[1];
		const when = parseDotDateTime(node.find('div[style*="font-size"]').first().text());
		const title = cleanTitle(link.text());
		if (!url || !id || !when || !title) return;
		cards.push({
			id,
			url,
			title,
			start: when.iso,
			allDay: when.allDay,
			image: absoluteUrl(node.find('img').first().attr('src'), base),
			excerpt: cleanText(node.find('.excerpt').first().text()) || undefined
		});
	});
	return cards;
}

export function parseTukumsDetail(html: string): Partial<RawEvent> {
	const $ = cheerio.load(html);
	const cells = new Map<string, string>();
	$('.card-table td').each((_, td) => {
		const label = cleanText($(td).find('h3').first().text());
		const value = cleanText($(td).clone().find('h3').remove().end().text());
		if (label && value) cells.set(label.toLowerCase(), value);
	});
	const ticketHref = $('.card-table a[target="_blank"]').first().attr('href');
	const price = parsePrice(cells.get('ieejas maksa'));
	const address = cells.get('kontaktinformācija');
	const description = $('.wisywig p')
		.map((_, p) => cleanText($(p).text()))
		.get()
		.filter(Boolean)
		.join(' ');
	return {
		description: cleanDescription(description),
		address: address && !/\d{8}/.test(address) ? address : undefined,
		town: townFromAddress(address),
		priceMin: price?.min,
		priceMax: price?.max,
		free: price?.free,
		tickets: ticketHref ? [{ seller: sellerFor(ticketHref), url: ticketHref }] : undefined
	};
}

export function tukumsEvent(card: TukumsCard, detail: Partial<RawEvent> = {}): RawEvent {
	return {
		source: 'tukums',
		sourceId: card.id,
		url: card.url,
		title: card.title,
		description: card.excerpt ? truncate(card.excerpt.replace(/\s*\.{3}$/, '…'), MAX_DESCRIPTION) : undefined,
		start: card.start,
		allDay: card.allDay || undefined,
		town: 'Tukums',
		image: card.image,
		lang: ['lv'],
		...Object.fromEntries(Object.entries(detail).filter(([, value]) => value !== undefined))
	};
}

// Talsi -------------------------------------------------------------------

/** Talsi listing cards. Dates are "20.11." with no year, so the year is inferred from `now`. */
export function parseTalsi(html: string, base: string, now: Date): RawEvent[] {
	const $ = cheerio.load(html);
	const events: RawEvent[] = [];
	$('a.event-archive__card').each((_, el) => {
		const node = $(el);
		const url = absoluteUrl(node.attr('href'), base);
		const title = cleanTitle(node.find('h2').first().text());
		const dateText = cleanText(node.find('.date').first().clone().find('.event-archive__time').remove().end().text());
		const dates = [...dateText.matchAll(/(\d{1,2})\.(\d{1,2})\./g)].map((m) => ({ day: Number(m[1]), month: Number(m[2]) }));
		if (!url || !title || dates.length === 0) return;
		const withYear = (d: { day: number; month: number }): Ymd => ({ ...d, year: inferYear(d.month, d.day, now) });
		const first = withYear(dates[0]);
		const timeText = cleanText(node.find('.event-archive__time').first().text());
		const times = [...timeText.matchAll(/\b([01]?\d|2[0-3])[.:]([0-5]\d)\b/g)].map((m) => ({ hour: Number(m[1]), minute: Number(m[2]) }));
		const last = dates.length > 1 ? withYear(dates[dates.length - 1]) : first;
		const spansDays = dates.length > 1;
		const end = spansDays ? isoOf(last, times[1] ?? { hour: 23, minute: 59 }) : times[1] ? isoOf(first, times[1]) : undefined;

		const location = cleanText(node.find('.event-archive__location').first().text());
		const parts = location.split(',').map((p) => p.trim()).filter(Boolean);
		const town = parts.length >= 2 ? parts[0] : 'Talsi';
		const venueParts = parts.length >= 2 ? parts.slice(1) : parts;
		const category = cleanText(node.find('.event-archive__category').first().text());
		events.push({
			source: 'talsi',
			sourceId: `${new URL(url).pathname}@${isoOf(first, times[0]).slice(0, 16)}`,
			url,
			title,
			start: isoOf(first, times[0]),
			end,
			allDay: times.length === 0 ? true : undefined,
			venueName: venueParts[0],
			address: venueParts.length > 1 ? venueParts.slice(1).join(', ') : undefined,
			town,
			image: absoluteUrl(node.find('img.img').first().attr('src'), base),
			categoryHint: category ? [category] : undefined,
			lang: ['lv']
		});
	});
	return events;
}

// Latgale -----------------------------------------------------------------

export interface LatgaleCard {
	url: string;
	title: string;
	venue?: string;
	start: Ymd;
	end?: Ymd;
}

function parseDotYmd(text: string): Ymd[] {
	return [...text.matchAll(/(\d{4})\.(\d{2})\.(\d{2})/g)].map((m) => ({ year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }));
}

/** Latgale month list. The badge label holds the ISO-like date or range "2026.11.06 - 2026.11.22". */
export function parseLatgaleList(html: string, base: string): LatgaleCard[] {
	const $ = cheerio.load(html);
	const cards: LatgaleCard[] = [];
	$('.be-daygroup').each((_, group) => {
		const dates = parseDotYmd($(group).find('.be-daybadge').attr('aria-label') ?? '');
		if (dates.length === 0) return;
		$(group)
			.find('a.be-evtlink')
			.each((__, link) => {
				const url = absoluteUrl($(link).attr('href'), base);
				const title = cleanTitle($(link).find('.be-evt-title').text());
				const venue = cleanText($(link).find('.be-evt-sub').text()).replace(/^@\s*/, '');
				if (url && title) cards.push({ url, title, venue: venue || undefined, start: dates[0], end: dates[1] });
			});
	});
	return cards;
}

/** Time, place, description and the largest attached image of a Latgale event page. */
export function parseLatgaleDetail(html: string): { time?: Clock; place?: string; description?: string; image?: string } {
	const $ = cheerio.load(html);
	const place = cleanText($('.be-meta div:contains("Vieta")').first().text()).replace(/^Vieta:\s*/, '');
	const image = $('a.be-attach-link').first().attr('href');
	return {
		time: parseTime($('.be-timepill').first().text()),
		place: place || undefined,
		description: truncate(stripContacts($('.be-desc-block').first().text()) ?? '', MAX_DESCRIPTION) || undefined,
		image
	};
}

export function latgaleEvent(
	card: LatgaleCard,
	detail: ReturnType<typeof parseLatgaleDetail> = {}
): RawEvent {
	const sameDay = !card.end || isoOf(card.end) === isoOf(card.start);
	const priceInfo = priceFromText(detail.description);
	const place = detail.place && detail.place !== card.venue ? detail.place : undefined;
	const town = place?.includes(',') ? townFromAddress(place) : undefined;
	return {
		source: 'latgale',
		sourceId: new URL(card.url).pathname,
		url: card.url,
		title: card.title,
		description: detail.description,
		start: isoOf(card.start, detail.time),
		end: sameDay ? undefined : isoOf(card.end!, { hour: 23, minute: 59 }),
		allDay: detail.time ? undefined : true,
		venueName: card.venue,
		address: place,
		town,
		priceMin: priceInfo.priceMin,
		priceMax: priceInfo.priceMax,
		free: priceInfo.free,
		image: detail.image,
		lang: ['lv']
	};
}

// Jelgava -----------------------------------------------------------------

/** jelgava.lv/pasakumi: cards grouped by category with date, time, place and price. */
export function parseJelgava(html: string, base: string): RawEvent[] {
	const $ = cheerio.load(html);
	const events: RawEvent[] = [];
	$('.events-section-wrap').each((_, section) => {
		const category = cleanText($(section).find('.events-section-title > a').first().text());
		$(section)
			.find('.events-items-wrap')
			.each((__, el) => {
				const node = $(el);
				const link = node.find('.events-title a').first();
				const url = absoluteUrl(link.attr('href'), base);
				const title = cleanTitle(link.text());
				const dateText = cleanText(node.find('.events-dates').first().text());
				const dates = parseDotDates(dateText);
				if (!url || !title || dates.length === 0) return;
				const clocks = [...cleanText(node.find('.events-times').first().text()).matchAll(/\b([01]?\d|2[0-3])[.:]([0-5]\d)\b/g)].map((m) => ({
					hour: Number(m[1]),
					minute: Number(m[2])
				}));
				const first = dates[0];
				const last = dates[dates.length - 1];
				const spansDays = dates.length > 1;
				const place = splitVenue(node.find('.events-places').first().text());
				const price = parsePrice(cleanText(node.find('.events-price').first().text()).replace(/\s*Eiro\b/i, ' EUR'));
				const image = node.find('.event-image-wrap img').first().attr('src');
				events.push({
					source: 'jelgava',
					sourceId: `${new URL(url).pathname}@${isoOf(first, clocks[0]).slice(0, 16)}`,
					url,
					title,
					start: isoOf(first, clocks[0]),
					end: spansDays ? isoOf(last, clocks[1] ?? { hour: 23, minute: 59 }) : clocks[1] ? isoOf(first, clocks[1]) : undefined,
					allDay: clocks.length === 0 ? true : undefined,
					venueName: place.venueName,
					address: place.address,
					town: 'Jelgava',
					priceMin: price?.min,
					priceMax: price?.max,
					free: price?.free,
					image: absoluteUrl(image, base),
					categoryHint: category ? [category] : undefined,
					lang: ['lv']
				});
			});
	});
	return events;
}

function parseDotDates(text: string): Ymd[] {
	return [...text.matchAll(/(\d{1,2})\.(\d{1,2})\.(\d{4})/g)].map((m) => ({ day: Number(m[1]), month: Number(m[2]), year: Number(m[3]) }));
}
