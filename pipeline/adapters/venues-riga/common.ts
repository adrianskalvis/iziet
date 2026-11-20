import type { RawEvent } from '../../../src/lib/shared/types';
import { rigaIso } from '../../../src/lib/shared/time';
import { cleanText, truncate } from '../../lib/html';

export const DESCRIPTION_MAX = 600;
export const MAX_OCCURRENCES = 20;
export const DAY_MS = 86_400_000;
/** A show without an end time counts as running this long. */
const DEFAULT_SHOW_MS = 3 * 3600_000;

/**
 * Month names and abbreviations in the venues' own spelling, keyed by the first
 * three folded letters. The shared monthFromWord() misses the abbreviation "Mai".
 */
const MONTHS: Record<string, number> = {
	jan: 1, feb: 2, mar: 3, apr: 4, mai: 5, jun: 6, jul: 7, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, dec: 12
};

export function monthNumber(word: string): number | undefined {
	const folded = word
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^a-z]/g, '');
	return MONTHS[folded.slice(0, 3)];
}

/** Sentence case, only when the whole title is upper case. */
export function fixShoutingTitle(title: string): string {
	const letters = title.replace(/[^\p{L}]/gu, '');
	if (letters.length < 4 || letters !== letters.toUpperCase() || letters === letters.toLowerCase()) return title;
	const lower = title.toLowerCase();
	return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Reads "19.00", "19:00" or "8:00". */
export function readTime(text: string | undefined): { hour: number; minute: number } | undefined {
	const match = text?.match(/(?:^|[^\d])([01]?\d|2[0-3])[.:]([0-5]\d)(?!\d)/);
	return match ? { hour: Number(match[1]), minute: Number(match[2]) } : undefined;
}

export function isoFrom(year: number, month: number, day: number, time?: { hour: number; minute: number }): string {
	return rigaIso(year, month, day, time?.hour ?? 0, time?.minute ?? 0);
}

/** Next occurrence of a day and month, counted from a day before `now`. */
export function inferYear(month: number, day: number, now: Date): number {
	const year = now.getUTCFullYear();
	const candidate = Date.UTC(year, month - 1, day, 23, 59);
	return candidate < now.getTime() - DAY_MS ? year + 1 : year;
}

export function plainText(value: string | undefined | null, max = DESCRIPTION_MAX): string | undefined {
	const text = cleanText(value);
	return text ? truncate(text, max) : undefined;
}

/** True when a show has not ended yet. */
export function notEnded(start: string, end: string | undefined, now: Date): boolean {
	const endMs = end ? Date.parse(end) : Date.parse(start) + DEFAULT_SHOW_MS;
	return endMs >= now.getTime();
}

export function withinHorizon(start: string, now: Date, horizonDays: number): boolean {
	return Date.parse(start) <= now.getTime() + horizonDays * DAY_MS;
}

export function sellerName(url: string): string {
	if (/bilesuserviss\.lv|piletilevi/i.test(url)) return 'Biļešu Serviss';
	if (/bilesuparadize\.lv/i.test(url)) return 'Biļešu Paradīze';
	if (/biletes\.opera\.lv/i.test(url)) return 'LNOB biļetes';
	if (/ticketshop\.lv/i.test(url)) return 'Ticketshop';
	if (/fienta\.com/i.test(url)) return 'Fienta';
	if (/mticket\.eu/i.test(url)) return 'mTicket';
	if (/passportix/i.test(url)) return 'Passportix';
	if (/ticketmaster/i.test(url)) return 'Ticketmaster';
	return new URL(url).hostname.replace(/^www\./, '');
}

export interface Show {
	start: string;
	end?: string;
	ticketUrl?: string;
	soldOut?: boolean;
}

export interface ProductionBase {
	source: string;
	sourceId: string;
	url: string;
	title: string;
	description?: string;
	venueName?: string;
	address?: string;
	town?: string;
	image?: string;
	imageWidth?: number;
	imageHeight?: number;
	categoryHint?: string[];
	tags?: string[];
	lang?: string[];
	ageMin?: number;
	defaultCategory?: RawEvent['defaultCategory'];
	priceMin?: number;
	priceMax?: number;
	free?: boolean;
}

/**
 * One RawEvent from a production and its shows. Upcoming shows only; the
 * earliest is the start, the next 20 are occurrences. Sold out when every
 * upcoming show is sold out.
 */
export function productionToEvent(
	base: ProductionBase,
	shows: Show[],
	now: Date,
	horizonDays: number
): RawEvent | undefined {
	const upcoming = shows
		.filter((show) => notEnded(show.start, show.end, now) && withinHorizon(show.start, now, horizonDays))
		.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
	if (upcoming.length === 0) return undefined;
	const [first, ...rest] = upcoming;
	const open = upcoming.find((show) => show.ticketUrl && !show.soldOut);
	const ticketUrl = (open ?? first).ticketUrl;
	return {
		...base,
		start: first.start,
		end: first.end,
		occurrences: rest.slice(0, MAX_OCCURRENCES).map((show) => show.start),
		tickets: ticketUrl ? [{ seller: sellerName(ticketUrl), url: ticketUrl }] : undefined,
		status: upcoming.every((show) => show.soldOut) ? 'soldout' : undefined
	};
}
