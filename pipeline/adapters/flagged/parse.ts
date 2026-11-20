import type { RawEvent } from '../../../src/lib/shared/types';
import { rigaIso } from '../../../src/lib/shared/time';
import { extractJsonLd, isEventNode, jsonLdEventToRaw } from '../../lib/jsonld';
import { absoluteUrl, cheerio, cleanText, htmlToText, truncate } from '../../lib/html';
import { cleanTitle, MAX_DESCRIPTION } from '../regional-venues/common';

/** Parsers for the three adapters that stay off until written permission arrives. */

type JsonNode = Record<string, unknown>;

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

function num(value: unknown): number | undefined {
	const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
	return Number.isFinite(parsed) ? parsed : undefined;
}

// Biļešu Serviss -----------------------------------------------------------

export const BILESUSERVISS_ORIGIN = 'https://www.bilesuserviss.lv';
export const BILESUSERVISS_SELLER = 'Biļešu Serviss';

export interface BsCard {
	code: string;
	url: string;
	title: string;
	venue?: string;
	image?: string;
	start: string;
	end?: string;
	allDay: boolean;
}

/** Reads card times such as "Pk 20.11.2026 • 19:00" and "T 18.11.2026 - Sv 22.11.2026". */
export function parseBsCardTime(text: string): { start: string; end?: string; allDay: boolean } | undefined {
	const clean = cleanText(text);
	const dates = [...clean.matchAll(/(\d{1,2})\.(\d{1,2})\.(\d{4})/g)].map((m) => ({
		day: Number(m[1]),
		month: Number(m[2]),
		year: Number(m[3])
	}));
	if (dates.length === 0) return undefined;
	const time = clean.match(/(\d{1,2}):(\d{2})/);
	const clock = time ? { hour: Number(time[1]), minute: Number(time[2]) } : undefined;
	const last = dates[dates.length - 1];
	return {
		start: isoOf(dates[0], clock),
		end: dates.length > 1 ? isoOf(last, { hour: 23, minute: 59 }) : undefined,
		allDay: !clock
	};
}

export function parseBsListing(html: string): BsCard[] {
	const $ = cheerio.load(html);
	const cards: BsCard[] = [];
	$('a.card[href^="/biletes/"]').each((_, el) => {
		const node = $(el);
		const href = node.attr('href') ?? '';
		const code = href.match(/^\/biletes\/([A-Z0-9]+)\//)?.[1];
		const when = parseBsCardTime(node.find('[data-cy="card-time"]').first().text());
		const title = cleanTitle(node.find('h3').first().text());
		if (!code || !when || !title || /Ārvalstīs/.test(node.text())) return;
		cards.push({
			code,
			url: absoluteUrl(href, BILESUSERVISS_ORIGIN)!,
			title,
			venue: cleanText(node.find('[data-cy="card-description"]').first().text()) || undefined,
			image: absoluteUrl(node.find('img.card__image').first().attr('src'), BILESUSERVISS_ORIGIN),
			...when
		});
	});
	return cards;
}

/** Card data only, used when the request budget has no room for the event page. */
export function bsCardEvent(card: BsCard): RawEvent {
	return {
		source: 'bilesuserviss',
		sourceId: card.code,
		url: card.url,
		title: card.title,
		start: card.start,
		end: card.end,
		allDay: card.allDay || undefined,
		venueName: card.venue,
		image: card.image,
		tickets: [{ seller: BILESUSERVISS_SELLER, url: card.url }],
		lang: ['lv']
	};
}

/**
 * Event page: Event JSON-LD inside an @graph. The shared helper reads `location.geo`, but this
 * site puts `latitude` and `longitude` on the Place, and the image is an @id reference to an
 * ImageObject, so both are patched here.
 */
export function parseBsEventPage(html: string, pageUrl: string): RawEvent | undefined {
	const nodes = extractJsonLd(html);
	const node = nodes.find(isEventNode);
	if (!node) return undefined;
	const base = jsonLdEventToRaw(node, { source: 'bilesuserviss', pageUrl, sellerName: () => BILESUSERVISS_SELLER });
	if (!base) return undefined;
	const location = (node.location ?? {}) as JsonNode;
	const country = ((location.address ?? {}) as JsonNode).addressCountry;
	if (typeof country === 'string' && country && country.toUpperCase() !== 'LV') return undefined;
	const imageRef = (node.image as JsonNode | undefined)?.['@id'];
	const imageNode = nodes.find((n) => n['@id'] === imageRef);
	const code = pageUrl.match(/\/biletes\/([A-Z0-9]+)\//)?.[1];
	const address = (location.address ?? {}) as JsonNode;
	return {
		...base,
		sourceId: code ?? base.sourceId,
		url: pageUrl,
		title: cleanTitle(base.title),
		description: base.description ? truncate(base.description, MAX_DESCRIPTION) : undefined,
		address: typeof address.streetAddress === 'string' ? cleanText(address.streetAddress) : base.address,
		lat: num(location.latitude) ?? base.lat,
		lng: num(location.longitude) ?? base.lng,
		image: base.image ?? (typeof imageNode?.contentUrl === 'string' ? imageNode.contentUrl : undefined),
		tickets: [{ seller: BILESUSERVISS_SELLER, url: pageUrl }],
		categoryHint: undefined,
		lang: ['lv']
	};
}

// latvia.travel ------------------------------------------------------------

export const LATVIA_TRAVEL_ORIGIN = 'https://www.latvia.travel';
export const LATVIA_TRAVEL_ENDPOINT = `${LATVIA_TRAVEL_ORIGIN}/lv/jsonapi/events/42`;

export interface LtItem {
	id: string;
	title: string;
	category?: string;
	municipality?: string;
	venue_name?: string;
	region?: string;
	city?: string;
	date: string;
	admition_fee?: string;
	link: string;
	image?: string;
	isFree?: boolean;
	/** A JSON string such as {"lattitude":"56.5","longitude":"21.0"}. */
	coordinates?: string | { lattitude?: string; longitude?: string };
}

export interface LtPage {
	results: LtItem[];
	pager?: { count: number; pages: number; current_page: number; next_page?: number | null };
}

interface DatePart {
	day: number;
	month: number;
	year?: number;
	clock?: Clock;
}

function parseLtPart(text: string): DatePart | { clock: Clock } | undefined {
	const date = text.match(/(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?/);
	const time = text.match(/(\d{1,2}):(\d{2})/);
	const clock = time ? { hour: Number(time[1]), minute: Number(time[2]) } : undefined;
	if (!date) return clock ? { clock } : undefined;
	return { day: Number(date[1]), month: Number(date[2]), year: date[3] ? Number(date[3]) : undefined, clock };
}

/**
 * Reads "Se 26.09 - Sv 06.12.2026", "Se 21.11.2026, 18:00 - 23:59", "Se 28.11.2026" and
 * "Pk 11.12.2026, 12:00 - Sv 13.12.2026, 19:00".
 */
export function parseLtDate(text: string): { start: string; end?: string; allDay: boolean } | undefined {
	const [rawA, rawB] = cleanText(text).split(/\s+-\s+/);
	const a = parseLtPart(rawA ?? '');
	const b = rawB ? parseLtPart(rawB) : undefined;
	if (!a || !('day' in a)) return undefined;
	const bDate = b && 'day' in b ? b : undefined;
	let year = a.year ?? bDate?.year;
	if (!year) return undefined;
	if (!a.year && bDate && a.month > bDate.month) year -= 1;
	const startDate: Ymd = { year, month: a.month, day: a.day };
	const start = isoOf(startDate, a.clock);
	if (bDate) {
		const endDate = { year: bDate.year ?? year, month: bDate.month, day: bDate.day };
		return { start, end: isoOf(endDate, bDate.clock ?? { hour: 23, minute: 59 }), allDay: !a.clock };
	}
	if (b?.clock && a.clock) return { start, end: isoOf(startDate, b.clock), allDay: false };
	return { start, allDay: !a.clock };
}

/** Picks the JPEG source closest to 600 to 1200 px wide from the image HTML. */
export function pickLtImage(html: string | undefined): string | undefined {
	if (!html) return undefined;
	const $ = cheerio.load(html);
	const sources = $('source')
		.map((_, el) => ({
			width: Number($(el).attr('width')),
			src: ($(el).attr('srcset') ?? '').split(/\s+/)[0],
			jpeg: $(el).attr('type') === 'image/jpeg'
		}))
		.get()
		.filter((s) => s.src && s.width > 0);
	const inRange = sources
		.filter((s) => s.width >= 600 && s.width <= 1200)
		.sort((x, y) => Number(y.jpeg) - Number(x.jpeg) || y.width - x.width);
	const best = inRange[0] ?? [...sources].sort((x, y) => x.width - y.width)[0];
	return absoluteUrl(best?.src ?? $('img').first().attr('src'), LATVIA_TRAVEL_ORIGIN);
}

function parseLtCoordinates(value: LtItem['coordinates']): { lat?: number; lng?: number } {
	let parsed = value;
	if (typeof value === 'string') {
		try {
			parsed = JSON.parse(value) as { lattitude?: string; longitude?: string };
		} catch {
			return {};
		}
	}
	if (!parsed || typeof parsed === 'string') return {};
	return { lat: num(parsed.lattitude), lng: num(parsed.longitude) };
}

export function parseLtPage(page: LtPage): RawEvent[] {
	const events: RawEvent[] = [];
	for (const item of page.results ?? []) {
		const when = parseLtDate(item.date);
		const title = cleanTitle(htmlToText(item.title));
		const url = absoluteUrl(item.link, LATVIA_TRAVEL_ORIGIN);
		if (!when || !title || !url) continue;
		const amounts = [...(item.admition_fee ?? '').matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
		const free = item.isFree === true || (amounts.length > 0 && Math.max(...amounts) === 0);
		events.push({
			source: 'latvia-travel',
			sourceId: item.id,
			url,
			title,
			start: when.start,
			end: when.end,
			allDay: when.allDay || undefined,
			venueName: htmlToText(item.venue_name) || undefined,
			town: htmlToText(item.city) || htmlToText(item.municipality) || undefined,
			...parseLtCoordinates(item.coordinates),
			priceMin: !free && amounts.length ? Math.min(...amounts) : undefined,
			priceMax: !free && amounts.length > 1 ? Math.max(...amounts) : undefined,
			free: free || undefined,
			image: pickLtImage(item.image),
			categoryHint: item.category ? [htmlToText(item.category)] : undefined,
			lang: ['lv']
		});
	}
	return events;
}

// Ticketshop ---------------------------------------------------------------

export const TICKETSHOP_ORIGIN = 'https://ticketshop.lv';

export function parseTicketshopSitemap(xml: string): string[] {
	return [...new Set([...xml.matchAll(/<loc>([^<]*\/lv\/events\/\d+)<\/loc>/g)].map((m) => m[1]))];
}

export function parseTicketshopEvent(html: string, pageUrl: string): RawEvent | undefined {
	const node = extractJsonLd(html).find(isEventNode);
	if (!node) return undefined;
	const base = jsonLdEventToRaw(node, { source: 'ticketshop', pageUrl, sellerName: () => 'Ticketshop' });
	if (!base) return undefined;
	const location = (node.location ?? {}) as JsonNode;
	const address = (location.address ?? {}) as JsonNode;
	const street = typeof address.streetAddress === 'string' ? cleanText(address.streetAddress) : undefined;
	const id = pageUrl.match(/\/events\/(\d+)/)?.[1];
	const tickets = [...new Map((base.tickets ?? []).map((t) => [t.url, t])).values()];
	return {
		...base,
		sourceId: id ?? base.sourceId,
		url: pageUrl,
		title: cleanTitle(base.title),
		description: base.description ? truncate(base.description, MAX_DESCRIPTION) : undefined,
		address: street,
		tickets: tickets.length ? tickets : [{ seller: 'Ticketshop', url: pageUrl }],
		categoryHint: undefined,
		lang: ['lv']
	};
}
