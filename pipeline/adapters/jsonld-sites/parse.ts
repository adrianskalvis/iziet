import type { AnyNode } from 'domhandler';
import type { CategoryId, RawEvent } from '../../../src/lib/shared/types';
import { toRigaIso } from '../../../src/lib/shared/time';
import { absoluteUrl, cheerio } from '../../lib/html';
import { isEventNode, jsonLdEventToRaw } from '../../lib/jsonld';
import { defined, sellerFromUrl } from './common';

export type JsonNode = Record<string, unknown>;
export type Selection = cheerio.Cheerio<AnyNode>;

export interface ListingItem {
	/** Event page URL. */
	url: string;
	/** What the listing already says about the event. */
	event?: Partial<RawEvent>;
}

export interface JsonLdSite {
	id: string;
	name: string;
	homepage: string;
	/** Town of the source. Overrides the town in the markup unless `townIsFallback` is set. */
	town: string;
	townIsFallback?: boolean;
	defaultCategory?: CategoryId;
	lang?: string[];
	/** Listing pages to read, fixed or computed from the run date. */
	listingUrls: string[] | ((now: Date, horizonDays: number) => string[]);
	/** "listing": events sit in JSON-LD on the listing pages. "detail": follow links to event pages. */
	mode: 'listing' | 'detail';
	/** Absolute event page URLs to follow, matched against every link and JSON-LD url on the listing. */
	detailLink?: RegExp;
	/** Also follow plain links that match `detailLink`. Default true. Off when menus contain look-alike links. */
	followAnchors?: boolean;
	/** Cap of event pages fetched per run. Default 120. */
	maxDetailPages?: number;
	/** Cap of listing pages followed per listing URL. Default 1. */
	maxListingPages?: number;
	/** Next listing page URL, or undefined on the last page. */
	nextPage?: ($: cheerio.CheerioAPI, pageUrl: string) => string | undefined;
	/** Event data read from listing markup. */
	parseListing?: (html: string, pageUrl: string, now: Date) => ListingItem[];
	/** Event pages with the same group key share one fetch; only the start differs. */
	detailGroup?: (url: string) => string;
	/** CSS selector of the element that wraps one event and its JSON-LD script. */
	containerSelector?: string;
	/** Description text from the event page markup, used when the JSON-LD has none. */
	describe?: ($: cheerio.CheerioAPI) => string | undefined;
	/** Adds data from the wrapping markup. */
	enrich?: (raw: RawEvent, container: Selection | undefined, node: JsonNode) => RawEvent;
	/** The event page URL replaces the URL inside the JSON-LD. */
	urlIsPage?: boolean;
	imageRewrite?: (url: string) => string;
	maxSpanDays?: number;
	keepUpper?: string[];
	skipTitle?: RegExp;
}

/** Fixes the two JSON faults seen in Latvian JSON-LD: missing commas between members and trailing commas. */
export function repairJson(text: string): string {
	return text
		.replace(/(["\]}\d]|true|false|null)\s+("(?:[A-Za-z@][^"\\]*)"\s*:)/g, '$1,$2')
		.replace(/,\s*([}\]])/g, '$1');
}

function tryParse(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
}

function flatten(value: unknown, out: JsonNode[], depth = 0): void {
	if (depth > 6) return;
	if (Array.isArray(value)) {
		for (const item of value) flatten(item, out, depth + 1);
		return;
	}
	if (!value || typeof value !== 'object') return;
	const node = value as JsonNode;
	out.push(node);
	for (const key of ['@graph', 'itemListElement', 'item', 'mainEntity']) {
		if (node[key]) flatten(node[key], out, depth + 1);
	}
}

/** All JSON-LD nodes in one script body, with graphs and item lists flattened. Repairs broken JSON. */
export function readJsonLd(raw: string): JsonNode[] {
	const text = raw.replace(/[\u0000-\u001f]+/g, ' ').trim();
	if (!text) return [];
	const parsed = tryParse(text) ?? tryParse(repairJson(text));
	const nodes: JsonNode[] = [];
	flatten(parsed, nodes);
	return nodes;
}

export interface FoundEvent {
	node: JsonNode;
	container?: Selection;
}

/** Event nodes on a page, each with its wrapping element when `containerSelector` is set. */
export function findEventNodes(html: string, containerSelector?: string): FoundEvent[] {
	const $ = cheerio.load(html);
	const found: FoundEvent[] = [];
	$('script[type="application/ld+json"]').each((_, element) => {
		const wrapping = containerSelector ? $(element).closest(containerSelector) : undefined;
		const container = wrapping?.length ? wrapping : containerSelector ? $(element).prevAll(containerSelector).first() : undefined;
		for (const node of readJsonLd($(element).contents().text())) {
			if (isEventNode(node)) found.push({ node, container: container?.length ? container : undefined });
		}
	});
	return found;
}

/** Maps every Event node on the page to a RawEvent. */
export function eventsFromHtml(html: string, pageUrl: string, site: JsonLdSite): RawEvent[] {
	const events: RawEvent[] = [];
	const pageText = site.describe?.(cheerio.load(html));
	for (const { node, container } of findEventNodes(html, site.containerSelector)) {
		let raw = jsonLdEventToRaw(node, { source: site.id, pageUrl, sellerName: sellerFromUrl });
		if (!raw) continue;
		if (site.urlIsPage) raw = { ...raw, url: pageUrl, sourceId: `${pageUrl}#${raw.start}` };
		if (!raw.description && pageText) raw = { ...raw, description: pageText };
		if (site.enrich) raw = site.enrich(raw, container, node);
		if (raw.image && site.imageRewrite) raw = { ...raw, image: site.imageRewrite(raw.image) };
		events.push(raw);
	}
	return events;
}

/** Event page URLs found in a listing: JSON-LD urls and links that match `detailLink`. */
export function listingTargets(html: string, pageUrl: string, site: JsonLdSite, now: Date): ListingItem[] {
	const items = new Map<string, ListingItem>();
	const add = (item: ListingItem) => {
		const existing = items.get(item.url);
		items.set(item.url, existing ? { url: item.url, event: { ...existing.event, ...defined(item.event ?? {}) } } : item);
	};
	const matches = (url: string) => !!site.detailLink && site.detailLink.test(url);

	for (const item of site.parseListing?.(html, pageUrl, now) ?? []) add(item);
	for (const found of findEventNodes(html)) {
		const url = absoluteUrl(typeof found.node.url === 'string' ? found.node.url : undefined, pageUrl);
		if (!url || !matches(url)) continue;
		const raw = jsonLdEventToRaw(found.node, { source: site.id, pageUrl });
		add({ url, event: raw ? { ...raw, url } : undefined });
	}
	if (site.followAnchors === false) return [...items.values()];
	const $ = cheerio.load(html);
	$('a[href]').each((_, element) => {
		const url = absoluteUrl($(element).attr('href'), pageUrl)?.replace(/#.*$/, '');
		if (url && url !== pageUrl && matches(url)) add({ url });
	});
	return [...items.values()];
}

/** Detail data wins; the listing fills what the detail page lacks. */
export function mergeEvent(detail: RawEvent, hint: Partial<RawEvent> | undefined): RawEvent {
	if (!hint) return detail;
	const merged = { ...defined(hint), ...defined(detail), start: detail.start, end: detail.end, allDay: detail.allDay } as RawEvent;
	const tickets = [...(detail.tickets ?? []), ...(hint.tickets ?? [])];
	return { ...merged, tickets: tickets.length ? tickets : undefined };
}

/** Copies a detail event to another occurrence of the same event. */
export function moveEvent(template: RawEvent, start: string, url: string): RawEvent {
	const shiftMs = Date.parse(start) - Date.parse(template.start);
	return {
		...template,
		url,
		sourceId: `${url}#${start}`,
		start,
		end: template.end ? toRigaIso(Date.parse(template.end) + shiftMs) : undefined,
		occurrences: undefined
	};
}
