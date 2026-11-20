import type { RawEvent, TicketLink } from '../../../src/lib/shared/types';
import { rigaIso } from '../../../src/lib/shared/time';
import { parseTime } from '../../lib/dates';
import { absoluteUrl, cheerio, cleanText, truncate } from '../../lib/html';
import { parsePrice } from '../../lib/price';

export const SOURCE_ID = 'liveriga';
export const BASE_URL = 'https://www.liveriga.com';

const DESCRIPTION_MAX = 600;
const MAX_OCCURRENCES = 20;
const DAY_MS = 86_400_000;
const PAST_GRACE_MS = 12 * 3600_000;
const IMAGE_WIDTH = 1200;

export interface ListingItem {
	url: string;
	category?: string;
	/** Date text as shown on the card, for example "20 Nov" or "23 Okt - 12 Dec". */
	dateText?: string;
}

/**
 * Month abbreviations on the site. The shared monthFromWord() misses "Mai"
 * (no match for ^maij or ^may), so the table is local.
 */
const MONTHS: Record<string, number> = {
	jan: 1, feb: 2, mar: 3, apr: 4, mai: 5, jun: 6, jul: 7, aug: 8, sep: 9, okt: 10, nov: 11, dec: 12
};

export function monthFromAbbreviation(word: string): number | undefined {
	const folded = word
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^a-z]/g, '');
	return MONTHS[folded.slice(0, 3)];
}

export function parseListingTotal(html: string): number | undefined {
	const match = cheerio.load(html)('.results').first().text().match(/no\s+(\d+)/);
	return match ? Number(match[1]) : undefined;
}

export function parseListing(html: string): ListingItem[] {
	const $ = cheerio.load(html);
	const seen = new Set<string>();
	const items: ListingItem[] = [];
	$('a.card-item').each((_, element) => {
		const card = $(element);
		const url = absoluteUrl(card.attr('href'), BASE_URL);
		if (!url || !url.includes('/apmekle/pasakumi/') || seen.has(url)) return;
		seen.add(url);
		items.push({
			url,
			category: cleanText(card.find('.card-pre-title').first().text()) || undefined,
			dateText: cleanText(card.find('time').first().text()) || undefined
		});
	});
	return items;
}

/** True when a single-date card is later than the horizon. Ranges and unreadable dates stay. */
export function listingBeyondHorizon(item: ListingItem, now: Date, horizonDays: number): boolean {
	const match = item.dateText?.match(/^(\d{1,2})\s+(\p{L}+)$/u);
	if (!match) return false;
	const month = monthFromAbbreviation(match[2]);
	if (!month) return false;
	const day = Number(match[1]);
	const year = now.getUTCFullYear();
	let candidate = Date.UTC(year, month - 1, day);
	if (candidate < now.getTime() - 31 * DAY_MS) candidate = Date.UTC(year + 1, month - 1, day);
	return candidate > now.getTime() + horizonDays * DAY_MS;
}

const SELLERS: Array<[RegExp, string]> = [
	[/bilesuserviss\.lv|piletilevi/i, 'Biļešu Serviss'],
	[/bilesuparadize\.lv/i, 'Biļešu Paradīze'],
	[/ticketshop\.lv/i, 'Ticketshop'],
	[/fienta\.com/i, 'Fienta'],
	[/kupitbilet\.lv/i, 'Kupitbilet']
];

export function sellerName(url: string): string {
	for (const [pattern, name] of SELLERS) if (pattern.test(url)) return name;
	return new URL(url).hostname.replace(/^www\./, '');
}

/** Sentence case, only when the whole title is upper case. */
export function fixShoutingTitle(title: string): string {
	const letters = title.replace(/[^\p{L}]/gu, '');
	if (letters.length < 4 || letters !== letters.toUpperCase() || letters === letters.toLowerCase()) return title;
	const lower = title.toLowerCase();
	return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function dmyToIso(day: number, month: number, year: number, time?: { hour: number; minute: number }): string {
	return rigaIso(year, month, day, time?.hour ?? 0, time?.minute ?? 0);
}

interface DetailDates {
	starts: string[];
	end?: string;
	allDay: boolean;
}

/** Reads the "Visi datumi" list, a dd.mm.yyyy range, or a single date with time. */
function readDates($: cheerio.CheerioAPI): DetailDates | undefined {
	const starts: string[] = [];
	$('ul.dates li').each((_, element) => {
		const item = $(element);
		const time = parseTime(item.find('span').text());
		const text = cleanText(item.clone().children().remove().end().text());
		const match = text.match(/^(\d{1,2})\s+(\p{L}+)\s+(\d{4})$/u);
		const month = match ? monthFromAbbreviation(match[2]) : undefined;
		if (match && month) starts.push(dmyToIso(Number(match[1]), month, Number(match[3]), time));
	});
	if (starts.length > 0) return { starts, allDay: false };

	const place = $('.event-place').first();
	const timeText = place.find('span.align-right').first().text();
	const dateText = cleanText(place.find('span.align-right').eq(1).text());
	const time = parseTime(timeText) ?? parseTime(cleanText($('.startTime').first().text()));
	const dates = [...dateText.matchAll(/(\d{1,2})\.(\d{1,2})\.(\d{4})/g)];
	if (dates.length === 0) {
		const iso = cleanText($('.dtstart').first().text()).match(/^(\d{4})-(\d{2})-(\d{2})$/);
		if (!iso) return undefined;
		return { starts: [dmyToIso(+iso[3], +iso[2], +iso[1], time)], allDay: !time };
	}
	const [first, last] = [dates[0], dates[dates.length - 1]];
	const start = dmyToIso(+first[1], +first[2], +first[3], time);
	if (dates.length === 1) return { starts: [start], allDay: !time };
	return { starts: [start], end: rigaIso(+last[3], +last[2], +last[1], 23, 59), allDay: !time };
}

function readCoordinates(href: string | undefined): { lat?: number; lng?: number } {
	const match = href?.match(/query=(-?\d+\.\d+),(-?\d+\.\d+)/);
	return match ? { lat: Number(match[1]), lng: Number(match[2]) } : {};
}

function definitionValue($: cheerio.CheerioAPI, label: string): string | undefined {
	let value: string | undefined;
	$('.info-contacts dt').each((_, element) => {
		if (value || !cleanText($(element).text()).toLowerCase().startsWith(label)) return;
		value = cleanText($(element).next('dd').text()) || undefined;
	});
	return value;
}

function readImage($: cheerio.CheerioAPI, pageUrl: string): string | undefined {
	const og = absoluteUrl($('meta[property="og:image"]').attr('content'), pageUrl);
	if (!og) return undefined;
	return og.includes('?') ? og : `${og}?w=${IMAGE_WIDTH}`;
}

function readDescription($: cheerio.CheerioAPI): string | undefined {
	const parts = [$('.textual-content .intro').first().text(), $('.textual-content > div').first().text()]
		.map((part) => cleanText(part))
		.filter(Boolean);
	const joined = parts.join(' ');
	return joined ? truncate(joined, DESCRIPTION_MAX) : undefined;
}

function readStatus(title: string, intro: string): RawEvent['status'] {
	const text = `${title} ${intro}`;
	if (/\batcelt[sa]?\b|\bnotiks\b.*\batcelt/i.test(text)) return 'cancelled';
	if (/\bizpārdot[sa]?\b/i.test(text)) return 'soldout';
	if (/\bpārcelt[sa]?\b/i.test(text)) return 'postponed';
	return undefined;
}

/** One detail page to one RawEvent. Past dates are dropped; returns undefined if nothing remains. */
export function parseDetail(html: string, pageUrl: string, now: Date, horizonDays: number): RawEvent | undefined {
	const $ = cheerio.load(html);
	const title = cleanText($('h1.head-title').first().text() || $('meta[property="og:title"]').attr('content'));
	const dates = readDates($);
	if (!title || !dates) return undefined;

	const earliest = now.getTime() - PAST_GRACE_MS;
	const latest = now.getTime() + horizonDays * DAY_MS;
	const endMs = dates.end ? Date.parse(dates.end) : undefined;
	const upcoming = dates.starts
		.filter((iso) => Date.parse(iso) >= earliest || (endMs !== undefined && endMs >= earliest))
		.filter((iso) => Date.parse(iso) <= latest);
	if (upcoming.length === 0) return undefined;
	const [start, ...later] = upcoming;

	const breadcrumb = $('.breadcrumb li').map((_, el) => cleanText($(el).text())).get();
	const category = breadcrumb[breadcrumb.length - 1];
	const slug = new URL(pageUrl).pathname.split('/')[4];

	const priceText = cleanText($('.info-price p').first().text());
	const price = parsePrice(priceText);
	const tickets: TicketLink[] = [];
	$('.buy-btn').each((_, element) => {
		const url = absoluteUrl($(element).attr('href'), pageUrl);
		if (url && !tickets.some((ticket) => ticket.url === url)) tickets.push({ seller: sellerName(url), url });
	});

	const venueLink = $('.info-contacts a.location').first();
	const intro = cleanText($('.textual-content .intro').first().text());
	const slugId = new URL(pageUrl).pathname.replace(/^\/lv\/apmekle\/pasakumi\//, '');
	return {
		source: SOURCE_ID,
		sourceId: slugId,
		url: pageUrl,
		title: fixShoutingTitle(title),
		description: readDescription($),
		start,
		end: dates.end,
		allDay: dates.allDay || undefined,
		occurrences: later.slice(0, MAX_OCCURRENCES),
		venueName: cleanText(venueLink.text()) || undefined,
		address: definitionValue($, 'adrese'),
		town: 'Rīga',
		...readCoordinates($('.info-contacts a[href*="google.com/maps"]').attr('href')),
		priceMin: price?.min,
		priceMax: price?.max,
		free: price?.free || undefined,
		tickets: tickets.length ? tickets : undefined,
		image: readImage($, pageUrl),
		categoryHint: [category, slug].filter((hint): hint is string => !!hint),
		status: readStatus(title, intro)
	};
}
