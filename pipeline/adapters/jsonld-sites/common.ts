import type { CategoryId, RawEvent, TicketLink } from '../../../src/lib/shared/types';
import { cleanText, htmlToText, truncate } from '../../lib/html';
import { RobotsDisallowedError } from '../../lib/http';
import type { AdapterContext } from '../types';

/**
 * Helpers shared by the generic adapters (jsonld-sites, ical-feeds, wp-events, kpanel).
 */

export const DESCRIPTION_MAX = 600;
/** Hard cap of HTTP requests per adapter run. */
export const MAX_REQUESTS = 200;
/** Events running longer than this are calendar banners, not events. */
export const DEFAULT_MAX_SPAN_DAYS = 90;

const DAY_MS = 86_400_000;
const PAST_GRACE_MS = 12 * 3_600_000;

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const PHONE_LABEL = '(?:(?:tālr|tel|mob|phone|тел)[\\p{L}]*\\.?\\s*:?\\s*)?';
const PHONE = new RegExp(
	`${PHONE_LABEL}(?:\\+?371[\\s-]?)?(?<!\\d|\\d[.,])(?:[26]\\d{7}|[26]\\d{3}[\\s-]\\d{4}|[26]\\d[\\s-]\\d{3}[\\s-]\\d{3})(?!\\d|[.,]\\d)`,
	'giu'
);

/** Removes e-mail addresses and Latvian phone numbers from free text. */
export function scrubPersonal(text: string): string {
	return text.replace(EMAIL, '').replace(PHONE, '').replace(/\s{2,}/g, ' ').trim();
}

/** HTML or plain text to a clean description of at most DESCRIPTION_MAX characters. */
export function cleanDescription(input: string | undefined | null): string | undefined {
	if (!input) return undefined;
	const text = scrubPersonal(htmlToText(input));
	return text ? truncate(text, DESCRIPTION_MAX) : undefined;
}

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Converts an all-uppercase title to sentence case. Titles with any lowercase
 * letter stay as they are. Tokens in `keepUpper` (acronyms) stay uppercase.
 */
export function sentenceCase(title: string, keepUpper: string[] = []): string {
	const letters = title.replace(/[^\p{L}]/gu, '');
	if (letters.length < 3 || letters !== letters.toUpperCase() || letters === letters.toLowerCase()) return title;
	let result = title.toLocaleLowerCase('lv');
	for (const token of keepUpper) {
		const pattern = new RegExp(`(?<![\\p{L}\\d])${escapeRegExp(token.toLocaleLowerCase('lv'))}(?![\\p{L}\\d])`, 'giu');
		result = result.replace(pattern, token);
	}
	return result.replace(/(^|[.!?]\s+)(\p{L})/gu, (_, lead: string, letter: string) => lead + letter.toLocaleUpperCase('lv'));
}

/** Decoded, whitespace-clean, sentence-cased title. */
export function cleanTitle(title: string | undefined | null, keepUpper: string[] = []): string {
	return sentenceCase(htmlToText(title ?? ''), keepUpper);
}

const SELLERS: Array<[RegExp, string]> = [
	[/bilesuparadize\.lv$/, 'Biļešu Paradīze'],
	[/bilesuserviss\.lv$/, 'Biļešu Serviss'],
	[/ticketshop\.lv$/, 'Ticketshop'],
	[/fienta\.com$/, 'Fienta'],
	[/piletilevi\.\w+$/, 'Piletilevi'],
	[/ekase\.lv$/, 'eKase'],
	[/ticketpro\.\w+$/, 'Ticketpro'],
	[/kase\.lv$/, 'Kase']
];

/** Seller display name from a ticket URL; falls back to the host name. */
export function sellerFromUrl(url: string): string {
	try {
		const host = new URL(url).hostname.replace(/^www\./, '');
		return SELLERS.find(([pattern]) => pattern.test(host))?.[1] ?? host;
	} catch {
		return url;
	}
}

const FREE_ENTRY = /bez\s*maksas|bezmaksas|ieeja\s*:?\s*br[iī]va|br[iī]va\s+ieeja|ieeja\s+bez/i;
const ENTRY_PRICE = /(?:ieeja|cena|biļetes?|dalības\s+maksa)[^.\n]{0,40}?(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:€|eur)/i;

/** Free entry or an entry price named in running text such as "Ieeja: 3,00 EUR". */
export function priceFromText(text: string | undefined): { free?: boolean; priceMin?: number } | undefined {
	if (!text) return undefined;
	if (FREE_ENTRY.test(text)) return { free: true };
	const amount = text.match(ENTRY_PRICE)?.[1];
	return amount ? { priceMin: Number(amount.replace(',', '.')) } : undefined;
}

/** Cancelled, sold out or postponed, as organisers write it in titles. */
export function statusFromTitle(title: string): 'cancelled' | 'soldout' | 'postponed' | undefined {
	if (/\b(atcelts|atcelta|atcelti|cancel+ed)\b/i.test(title)) return 'cancelled';
	if (/\b(pārcelts|pārcelta|pārcelti|postponed)\b/i.test(title)) return 'postponed';
	if (/\b(izpārdots|izpārdota|sold\s*out)\b/i.test(title)) return 'soldout';
	return undefined;
}

export function ticketLink(url: string | undefined): TicketLink | undefined {
	return url ? { seller: sellerFromUrl(url), url } : undefined;
}

/** Latvia and its waters, rough box. Rejects 0,0 placeholders. */
export function validCoordinates(lat: number | undefined, lng: number | undefined): boolean {
	return lat !== undefined && lng !== undefined && lat > 55 && lat < 58.5 && lng > 20.5 && lng < 28.5;
}

export interface FinishOptions {
	town?: string;
	/** The town is a fallback for events that carry their own. */
	townIsFallback?: boolean;
	defaultCategory?: CategoryId;
	lang?: string[];
	keepUpper?: string[];
	/** Titles made of personal names: leave capitals alone here; normalize.ts capitalises each word. */
	namesInTitles?: boolean;
	skipTitle?: RegExp;
}

/** Applies the field rules every adapter shares. Returns undefined for unusable events. */
export function finishEvent(event: RawEvent, options: FinishOptions): RawEvent | undefined {
	const title = options.namesInTitles ? htmlToText(event.title ?? '') : cleanTitle(event.title, options.keepUpper);
	if (!title || options.skipTitle?.test(title)) return undefined;
	const startMs = Date.parse(event.start);
	if (Number.isNaN(startMs)) return undefined;
	const endMs = event.end ? Date.parse(event.end) : NaN;
	const hasEnd = !Number.isNaN(endMs) && endMs > startMs;
	const tickets = dedupeTickets(event.tickets);
	const asCoordinates = event.address?.match(/^(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/);
	const lat = event.lat ?? (asCoordinates ? Number(asCoordinates[1]) : undefined);
	const lng = event.lng ?? (asCoordinates ? Number(asCoordinates[2]) : undefined);
	const freeOnly = event.free === true && !(event.priceMax && event.priceMax > 0);
	return {
		...event,
		priceMin: freeOnly ? undefined : event.priceMin,
		priceMax: freeOnly ? undefined : event.priceMax,
		title,
		description: cleanDescription(event.description),
		end: hasEnd ? event.end : undefined,
		town: options.townIsFallback ? (event.town ?? options.town) : (options.town ?? event.town),
		address: asCoordinates ? undefined : event.address,
		lat: validCoordinates(lat, lng) ? lat : undefined,
		lng: validCoordinates(lat, lng) ? lng : undefined,
		tickets: tickets.length ? tickets : undefined,
		lang: event.lang?.length ? event.lang : options.lang,
		defaultCategory: event.defaultCategory ?? options.defaultCategory,
		organizer: event.organizer ? scrubPersonal(event.organizer) || undefined : undefined,
		categoryHint: event.categoryHint?.length ? [...new Set(event.categoryHint)] : undefined
	};
}

function dedupeTickets(tickets: TicketLink[] | undefined): TicketLink[] {
	const seen = new Set<string>();
	return (tickets ?? []).filter((ticket) => !seen.has(ticket.url) && !!seen.add(ticket.url));
}

export interface WindowOptions {
	now: Date;
	horizonDays: number;
	maxSpanDays?: number;
}

/**
 * True when the event starts before the horizon, has not ended more than 12 hours
 * ago and is not a long-running banner.
 */
export function inWindow(event: Pick<RawEvent, 'start' | 'end' | 'allDay'>, options: WindowOptions): boolean {
	const startMs = Date.parse(event.start);
	if (Number.isNaN(startMs)) return false;
	const nowMs = options.now.getTime();
	if (startMs >= nowMs + options.horizonDays * DAY_MS) return false;
	const endMs = event.end ? Date.parse(event.end) : NaN;
	const lastMs = Number.isNaN(endMs) ? startMs : endMs;
	const allDayPad = event.allDay ? DAY_MS : 0;
	if (lastMs + allDayPad < nowMs - PAST_GRACE_MS) return false;
	const maxSpan = (options.maxSpanDays ?? DEFAULT_MAX_SPAN_DAYS) * DAY_MS;
	return Number.isNaN(endMs) || endMs - startMs <= maxSpan;
}

/** Keeps the first event per sourceId. */
export function dedupeBySourceId(events: RawEvent[]): RawEvent[] {
	const seen = new Set<string>();
	return events.filter((event) => !seen.has(event.sourceId) && !!seen.add(event.sourceId));
}

/** Counts requests against MAX_REQUESTS and turns failures into log lines. */
export class RequestBudget {
	private used = 0;

	constructor(
		private readonly ctx: AdapterContext,
		private readonly limit = MAX_REQUESTS
	) {}

	get remaining(): number {
		return this.limit - this.used;
	}

	/** Fetches a URL as text. Returns undefined when the budget is spent, robots.txt blocks it or it fails. */
	async text(url: string): Promise<string | undefined> {
		if (this.used >= this.limit) {
			this.ctx.log(`request budget of ${this.limit} spent, skipping ${url}`);
			return undefined;
		}
		this.used++;
		try {
			return await this.ctx.http.text(url);
		} catch (error) {
			if (error instanceof RobotsDisallowedError) this.ctx.log(`blocked by robots.txt, returning no events from ${url}`);
			else this.ctx.log(`failed ${url}: ${(error as Error).message}`);
			return undefined;
		}
	}

	async json<T>(url: string): Promise<T | undefined> {
		const body = await this.text(url);
		if (body === undefined) return undefined;
		try {
			return JSON.parse(body) as T;
		} catch {
			this.ctx.log(`invalid JSON from ${url}`);
			return undefined;
		}
	}
}

/** Drops keys whose value is undefined, so spreads do not erase earlier values. */
export function defined<T extends object>(value: T): Partial<T> {
	return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined && v !== '')) as Partial<T>;
}

export { cleanText };
