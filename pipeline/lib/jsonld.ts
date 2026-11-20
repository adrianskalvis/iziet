import type { RawEvent } from '../../src/lib/shared/types';
import { parseIsoLoose } from './dates';
import { absoluteUrl, cheerio, cleanText, htmlToText } from './html';

/**
 * schema.org Event extraction from HTML pages. Many Latvian venue and city
 * sites embed <script type="application/ld+json"> blocks with Event data.
 */

type JsonNode = Record<string, unknown>;

const EVENT_TYPES = new Set([
	'Event',
	'MusicEvent',
	'TheaterEvent',
	'Festival',
	'ExhibitionEvent',
	'ScreeningEvent',
	'SportsEvent',
	'ChildrensEvent',
	'ComedyEvent',
	'DanceEvent',
	'EducationEvent',
	'FoodEvent',
	'LiteraryEvent',
	'SocialEvent',
	'VisualArtsEvent',
	'SaleEvent',
	'BusinessEvent',
	'CourseInstance',
	'EventSeries'
]);

/** Every JSON-LD node on the page, with @graph and arrays flattened. */
export function extractJsonLd(html: string): JsonNode[] {
	const $ = cheerio.load(html);
	const nodes: JsonNode[] = [];
	$('script[type="application/ld+json"]').each((_, element) => {
		const raw = $(element).contents().text().trim();
		if (!raw) return;
		try {
			collect(JSON.parse(raw.replace(/[\u0000-\u001f]+/g, ' ')), nodes);
		} catch {
			// Broken JSON-LD on a page is common; skip that block.
		}
	});
	return nodes;
}

function collect(value: unknown, out: JsonNode[]): void {
	if (Array.isArray(value)) {
		for (const item of value) collect(item, out);
		return;
	}
	if (!value || typeof value !== 'object') return;
	const node = value as JsonNode;
	if (Array.isArray(node['@graph'])) collect(node['@graph'], out);
	if (Array.isArray(node.itemListElement)) {
		for (const element of node.itemListElement as JsonNode[]) collect(element?.item ?? element, out);
	}
	out.push(node);
}

function types(node: JsonNode): string[] {
	const type = node['@type'];
	return (Array.isArray(type) ? type : [type]).filter((t): t is string => typeof t === 'string');
}

export function isEventNode(node: JsonNode): boolean {
	return types(node).some((type) => EVENT_TYPES.has(type.replace(/^schema:|^https?:\/\/schema\.org\//, '')));
}

export function findEvents(html: string): JsonNode[] {
	return extractJsonLd(html).filter(isEventNode);
}

function str(value: unknown): string | undefined {
	if (typeof value === 'string') return cleanText(value) || undefined;
	if (typeof value === 'number') return String(value);
	return undefined;
}

function first<T>(value: T | T[] | undefined): T | undefined {
	return Array.isArray(value) ? value[0] : value;
}

function num(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string') {
		const parsed = Number(value.replace(',', '.').replace(/[^\d.]/g, ''));
		return value.trim() && Number.isFinite(parsed) ? parsed : undefined;
	}
	return undefined;
}

function imageUrl(value: unknown, base: string): string | undefined {
	const image = first(value as unknown[] | unknown);
	if (typeof image === 'string') return absoluteUrl(image, base);
	if (image && typeof image === 'object') {
		const node = image as JsonNode;
		return absoluteUrl(str(node.url) ?? str(node.contentUrl), base);
	}
	return undefined;
}

function parseAgeRange(value: unknown): { ageMin?: number; ageMax?: number } {
	const text = str(value);
	if (!text) return {};
	const range = text.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})/);
	if (range) return { ageMin: Number(range[1]), ageMax: Number(range[2]) };
	const plus = text.match(/(\d{1,2})\s*\+/);
	return plus ? { ageMin: Number(plus[1]) } : {};
}

export interface JsonLdOptions {
	source: string;
	/** Page URL, used to resolve relative links and as a fallback event URL. */
	pageUrl: string;
	/** Seller name for offer URLs. Defaults to the offer host. */
	sellerName?: (offerUrl: string) => string;
}

/** Maps one schema.org Event node to a RawEvent, or undefined if it lacks a name or start. */
export function jsonLdEventToRaw(node: JsonNode, options: JsonLdOptions): RawEvent | undefined {
	const title = str(node.name);
	const start = parseIsoLoose(str(node.startDate));
	if (!title || !start) return undefined;
	const parsedEnd = parseIsoLoose(str(node.endDate));
	const end = parsedEnd && Date.parse(parsedEnd.iso) >= Date.parse(start.iso) ? parsedEnd : undefined;
	const url = absoluteUrl(str(node.url) ?? str(node['@id']), options.pageUrl) ?? options.pageUrl;

	const location = first(node.location as JsonNode | JsonNode[] | undefined);
	const address = location && typeof location === 'object' ? (location.address as JsonNode | string | undefined) : undefined;
	const geo = location && typeof location === 'object' ? (location.geo as JsonNode | undefined) : undefined;
	const addressText =
		typeof address === 'string'
			? cleanText(address)
			: address
				? [str(address.streetAddress), str(address.addressLocality)].filter(Boolean).join(', ')
				: undefined;

	const offers = ([] as JsonNode[]).concat((node.offers as JsonNode | JsonNode[] | undefined) ?? []);
	const prices = offers.flatMap((offer) => [num(offer.price), num(offer.lowPrice), num(offer.highPrice)]).filter(
		(value): value is number => value !== undefined
	);
	const tickets = offers
		.map((offer) => absoluteUrl(str(offer.url), options.pageUrl))
		.filter((link): link is string => !!link)
		.map((link) => ({ seller: options.sellerName?.(link) ?? new URL(link).hostname.replace(/^www\./, ''), url: link }));
	const soldOut = offers.length > 0 && offers.every((offer) => /SoldOut/i.test(str(offer.availability) ?? ''));

	const statusText = str(node.eventStatus) ?? '';
	const status = /Cancelled/i.test(statusText)
		? 'cancelled'
		: /Postponed|Rescheduled/i.test(statusText)
			? 'postponed'
			: soldOut
				? 'soldout'
				: undefined;

	const language = str(node.inLanguage) ?? str((node.inLanguage as JsonNode | undefined)?.name);

	return {
		source: options.source,
		sourceId: str(node['@id']) ?? `${url}#${start.iso}`,
		url,
		title,
		description: htmlToText(str(node.description)) || undefined,
		start: start.iso,
		end: end?.iso,
		allDay: start.allDay || undefined,
		venueName: location && typeof location === 'object' ? str(location.name) : str(location),
		address: addressText || undefined,
		town: address && typeof address === 'object' ? str(address.addressLocality) : undefined,
		lat: geo ? num(geo.latitude) : location && typeof location === 'object' ? num(location.latitude) : undefined,
		lng: geo ? num(geo.longitude) : location && typeof location === 'object' ? num(location.longitude) : undefined,
		priceMin: prices.length ? Math.min(...prices) : undefined,
		priceMax: prices.length > 1 ? Math.max(...prices) : undefined,
		free: prices.length > 0 && Math.max(...prices) === 0 ? true : undefined,
		tickets: tickets.length ? tickets : undefined,
		image: imageUrl(node.image, options.pageUrl),
		categoryHint: types(node).filter((type) => type !== 'Event'),
		lang: language ? [language.slice(0, 2).toLowerCase()] : undefined,
		status,
		organizer: str((first(node.organizer as JsonNode | JsonNode[] | undefined) ?? {}).name),
		...parseAgeRange(node.typicalAgeRange)
	};
}
