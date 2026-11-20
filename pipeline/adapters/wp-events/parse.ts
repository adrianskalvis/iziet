import type { CategoryId, RawEvent, TicketLink } from '../../../src/lib/shared/types';
import { rigaIso } from '../../../src/lib/shared/time';
import { parseIsoLoose } from '../../lib/dates';
import { cheerio, cleanText, truncate } from '../../lib/html';
import { parsePrice } from '../../lib/price';
import { cleanTitle, defined, priceFromText, sellerFromUrl, statusFromTitle } from '../jsonld-sites/common';

/** The Events Calendar REST API (tribe/events/v1), the parts the adapter reads. */
export interface TecImageSize {
	url: string;
	width?: number;
}

export interface TecEvent {
	id: number;
	url: string;
	title: string;
	description?: string;
	all_day?: boolean;
	start_date: string;
	end_date?: string;
	cost?: string;
	cost_details?: { values?: Array<string | number> };
	website?: string;
	image?: (TecImageSize & { sizes?: Record<string, TecImageSize> }) | false;
	categories?: Array<{ name: string }>;
	venue?: { venue?: string; address?: string; city?: string; geo_lat?: number | string; geo_lng?: number | string } | unknown[];
	status?: string;
}

export interface TecResponse {
	events: TecEvent[];
	next_rest_url?: string;
	total_pages?: number;
}

export interface TecSite {
	id: string;
	name: string;
	homepage: string;
	/** REST endpoint, for example https://host/wp-json/tribe/events/v1/events. */
	apiUrl: string;
	town: string;
	/** Prefix for venue names that name only a hall, for example "Dzintaru koncertzāle". */
	venuePrefix?: string;
	/** Street address of a single-venue site. */
	address?: string;
	defaultCategory?: CategoryId;
	lang?: string[];
	/** Categories that only mark a language version: name to language code. */
	languageCategories?: Record<string, string>;
	/** Remove the version in another language when the Latvian one has the same start and ticket link. */
	removeTranslations?: boolean;
	/** Each calendar entry is a day digest: one paragraph per event, "<strong>HH.MM Venue</strong> Title". */
	digest?: boolean;
}

const MIN_IMAGE_WIDTH = 600;
const MAX_IMAGE_WIDTH = 1200;
const TITLE_MAX = 140;

/** Image URL closest to 600 to 1200 px wide. */
export function pickImage(image: TecEvent['image']): string | undefined {
	if (!image) return undefined;
	const candidates = [{ url: image.url, width: image.width }, ...Object.values(image.sizes ?? {})].filter((c): c is TecImageSize => !!c.url);
	const widest = (list: TecImageSize[]) => list.reduce((a, b) => ((b.width ?? 0) > (a.width ?? 0) ? b : a)).url;
	const inRange = candidates.filter((c) => c.width && c.width >= MIN_IMAGE_WIDTH && c.width <= MAX_IMAGE_WIDTH);
	if (inRange.length) return widest(inRange);
	const under = candidates.filter((c) => c.width && c.width < MAX_IMAGE_WIDTH);
	return under.length ? widest(under) : image.url;
}

function venueOf(event: TecEvent) {
	const venue = event.venue;
	return venue && !Array.isArray(venue) && typeof venue === 'object' ? venue : undefined;
}

function numberOrUndefined(value: unknown): number | undefined {
	const parsed = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
	return Number.isFinite(parsed) && parsed !== 0 ? parsed : undefined;
}

function priceOf(event: TecEvent) {
	const values = (event.cost_details?.values ?? []).map(Number).filter((n) => Number.isFinite(n));
	if (values.length) {
		const min = Math.min(...values);
		const max = Math.max(...values);
		return max === 0 ? { free: true } : { priceMin: min, priceMax: max > min ? max : undefined };
	}
	const parsed = parsePrice(event.cost);
	return parsed ? { priceMin: parsed.min, priceMax: parsed.max, free: parsed.free } : undefined;
}

function ticketsOf(event: TecEvent, site: TecSite): TicketLink[] | undefined {
	const website = event.website?.trim();
	if (!website) return undefined;
	try {
		if (new URL(website).hostname.replace(/^www\./, '') === new URL(site.homepage).hostname.replace(/^www\./, '')) return undefined;
	} catch {
		return undefined;
	}
	return [{ seller: sellerFromUrl(website), url: website }];
}

function localTime(value: string | undefined) {
	return parseIsoLoose(value?.trim());
}

/** Maps one TEC event. Digest sites go through `splitDigest` instead. */
export function mapTecEvent(event: TecEvent, site: TecSite): RawEvent | undefined {
	const start = localTime(event.start_date);
	if (!start || !event.title) return undefined;
	const allDay = !!event.all_day;
	const end = localTime(event.end_date);
	const sameDayEnd = allDay && end && end.iso.slice(0, 10) === start.iso.slice(0, 10);
	const venue = venueOf(event);
	const hall = cleanText(venue?.venue);
	const prefixed = hall && site.venuePrefix && !hall.toLowerCase().includes(site.venuePrefix.toLowerCase().split(' ')[0]);
	const venueName = prefixed ? `${site.venuePrefix}, ${hall}` : hall || site.venuePrefix;
	const names = (event.categories ?? []).map((category) => cleanText(category.name)).filter(Boolean);
	const languages = names.map((name) => site.languageCategories?.[name]).filter((code): code is string => !!code);
	const title = cleanTitle(event.title);
	return {
		source: site.id,
		sourceId: String(event.id),
		url: event.url,
		title,
		description: event.description,
		start: allDay ? rigaIso(+start.iso.slice(0, 4), +start.iso.slice(5, 7), +start.iso.slice(8, 10)) : start.iso,
		end: end && !sameDayEnd ? end.iso : undefined,
		allDay: allDay || undefined,
		venueName: venueName || undefined,
		address: cleanText(venue?.address) || site.address,
		town: cleanText(venue?.city) || site.town,
		lat: numberOrUndefined(venue?.geo_lat),
		lng: numberOrUndefined(venue?.geo_lng),
		...priceOf(event),
		tickets: ticketsOf(event, site),
		image: pickImage(event.image),
		categoryHint: names.filter((name) => !site.languageCategories?.[name]),
		lang: languages.length ? languages : undefined,
		status: statusFromTitle(title) ?? (event.status === 'cancelled' ? 'cancelled' : undefined)
	};
}

/**
 * Removes the English or Russian copy of an event when the Latvian copy has the same
 * start and ticket link or image. Copies without a twin stay.
 */
export function removeTranslations(events: RawEvent[]): RawEvent[] {
	const key = (event: RawEvent) => `${event.start}|${event.tickets?.[0]?.url.match(/\/event\/(\d+)/)?.[1] ?? event.image ?? ''}`;
	const latvian = new Set(events.filter((event) => event.lang?.includes('lv')).map(key));
	return events.filter((event) => event.lang?.includes('lv') || !event.lang || !latvian.has(key(event)));
}

/** "20.00 Alūksnes Sporta centrā" into time and venue. */
const DIGEST_HEAD = /^(\d{1,2})[.:](\d{2})\s*(.*)$/;

function titleFromBody(body: string): string {
	const sentence = body.match(/^(.{12,}?[^\d\s][.!?])(?:\s+(?=[\p{Lu}“"])|$)/u)?.[1];
	const first = sentence && sentence.length <= TITLE_MAX ? sentence.replace(/[.]$/, '') : body;
	return first.length <= TITLE_MAX ? first : truncate(first, TITLE_MAX);
}

/** Splits a day digest ("Sports", "Citi", "Kultūra") into one event per paragraph. */
export function splitDigest(event: TecEvent, site: TecSite): RawEvent[] {
	const day = localTime(event.start_date);
	if (!day) return [];
	const year = +day.iso.slice(0, 4);
	const month = +day.iso.slice(5, 7);
	const date = +day.iso.slice(8, 10);
	const $ = cheerio.load(`<div id="root">${event.description ?? ''}</div>`);
	const events: RawEvent[] = [];
	$('#root p').each((index, paragraph) => {
		const head = cleanText($(paragraph).find('strong, b').first().text());
		const full = cleanText($(paragraph).text());
		const body = cleanText(head && full.startsWith(head) ? full.slice(head.length) : full);
		const match = head.match(DIGEST_HEAD);
		if (!match || body.length < 4) return;
		const [, hour, minute, venue] = match;
		const title = titleFromBody(body);
		events.push({
			source: site.id,
			sourceId: `${event.id}#${index}`,
			url: event.url,
			title,
			description: body.length > title.length ? body : undefined,
			start: rigaIso(year, month, date, +hour, +minute),
			venueName: venue || undefined,
			town: site.town,
			...defined(priceFromText(body) ?? {}),
			categoryHint: [cleanText(event.title)],
			status: statusFromTitle(body)
		});
	});
	return events;
}

/** Maps a TEC response page to RawEvents. */
export function parseTecResponse(response: TecResponse, site: TecSite): RawEvent[] {
	const events = (response.events ?? []).flatMap((event) => (site.digest ? splitDigest(event, site) : [mapTecEvent(event, site)]));
	const mapped = events.filter((event): event is RawEvent => !!event);
	return site.removeTranslations ? removeTranslations(mapped) : mapped;
}
