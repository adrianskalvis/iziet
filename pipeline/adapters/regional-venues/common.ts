import type { RawEvent } from '../../../src/lib/shared/types';
import { cleanText, htmlToText, truncate } from '../../lib/html';

/** Shared helpers for the adapters in regional-venues, municipal-platform and flagged. */

export const MAX_DESCRIPTION = 600;
export const ENDED_GRACE_MS = 12 * 3600_000;
const DAY_MS = 86_400_000;

/** Lower-cases a title that has no lowercase letters and capitalises each sentence. */
export function cleanTitle(value: string | undefined | null): string {
	const text = cleanText(value);
	const letters = text.replace(/[^\p{L}]/gu, '');
	if (letters.length < 3 || letters !== letters.toUpperCase() || letters === letters.toLowerCase()) return text;
	const lower = text.toLowerCase();
	return lower.replace(/(^|[.!?]\s+)(["“„«(]?)(\p{L})/gu, (_, lead: string, quote: string, ch: string) => lead + quote + ch.toUpperCase());
}

/** Plain-text description, at most 600 characters. */
export function cleanDescription(html: string | undefined | null): string | undefined {
	const text = htmlToText(html);
	return text ? truncate(text, MAX_DESCRIPTION) : undefined;
}

/** Keeps events that start inside the horizon and have not ended more than 12 hours ago. */
export function inWindow(event: RawEvent, now: Date, horizonDays: number): boolean {
	const start = Date.parse(event.start);
	if (Number.isNaN(start)) return false;
	if (start > now.getTime() + horizonDays * DAY_MS) return false;
	const end = event.end ? Date.parse(event.end) : start;
	const last = Number.isNaN(end) ? start : Math.max(start, end);
	return last >= now.getTime() - ENDED_GRACE_MS;
}

/** Drops duplicates by sourceId, keeping the first. */
export function uniqueBySourceId(events: RawEvent[]): RawEvent[] {
	const seen = new Set<string>();
	return events.filter((event) => {
		if (seen.has(event.sourceId)) return false;
		seen.add(event.sourceId);
		return true;
	});
}

/** Splits "Venue, street 1, LV-1010" into a venue name and the rest as address. */
export function splitVenue(text: string | undefined | null): { venueName?: string; address?: string } {
	const clean = cleanText(text);
	if (!clean) return {};
	const comma = clean.indexOf(',');
	if (comma < 0) return { venueName: clean };
	return { venueName: clean.slice(0, comma).trim(), address: clean.slice(comma + 1).trim() };
}

/** Pads a number to 2 digits. */
export const pad2 = (n: number): string => String(n).padStart(2, '0');

export function dayStamp(date: Date): string {
	return `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}`;
}

const SELLERS: Array<[RegExp, string]> = [
	[/bilesuparadize\.lv/i, 'Biļešu Paradīze'],
	[/bilesuserviss\.lv/i, 'Biļešu Serviss'],
	[/ticketshop\.lv/i, 'Ticketshop'],
	[/ticketbest\.eu/i, 'Ticketbest'],
	[/fienta\.com/i, 'Fienta'],
	[/piletilevi\./i, 'Piletilevi'],
	[/kase\.lv/i, 'Kase.lv']
];

/** Seller display name for a ticket link; falls back to the host name. */
export function sellerFor(url: string): string {
	const known = SELLERS.find(([pattern]) => pattern.test(url));
	if (known) return known[1];
	try {
		return new URL(url).hostname.replace(/^www\./, '');
	} catch {
		return url;
	}
}

const PHONE = /(?:\+?\d[\s-]?){8,}/;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;

const CONTACT_LABEL =
	/(?:(?:tālr(?:unis|\.)?|tel\.?|mob\.?|rezervācijām|rezervēt|pieteikšanās|pieteikties|sazināties|zvaniet|e-?pasts)[^\p{L}\d]{0,6})+(?:(?:\+?\d[\s-]?){8,}|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)/giu;

/** Removes phone numbers and e-mail addresses with their label, then sentences that still hold one. */
export function stripContacts(text: string | undefined | null): string | undefined {
	const clean = cleanText(text).replace(CONTACT_LABEL, ' ');
	if (!clean) return undefined;
	const kept = clean
		.split(/(?<=[.!?])\s+/)
		.filter((sentence) => !PHONE.test(sentence) && !EMAIL.test(sentence) && !/whatsapp/i.test(sentence));
	const result = kept.join(' ').replace(/\s+/g, ' ').replace(/^[\s.,;:]+/, '').trim();
	return result || undefined;
}

/** First part of an address list that is a place name: "Street 1, Engure, Engures pagasts" gives "Engure". */
export function townFromAddress(address: string | undefined | null): string | undefined {
	for (const part of cleanText(address).split(',').map((p) => p.trim())) {
		if (!part || /\d/.test(part) || /pagasts|novads|^LV-|iela|prospekts|bulvāris|šoseja|laukums/i.test(part)) continue;
		return part.replace(/^[„“”"«»]+|[„“”"«»]+$/g, '').trim() || undefined;
	}
	return undefined;
}

/** Lowest and highest euro amount in free text such as "Pieaugušajiem 35 EUR, bērniem 17,5 EUR". */
export function priceFromText(text: string | undefined | null): { priceMin?: number; priceMax?: number; free?: boolean } {
	const clean = cleanText(text);
	if (!clean) return {};
	const amounts = [...clean.matchAll(/(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:€|eur|eiro|euro)/gi)].map((m) => Number(m[1].replace(',', '.')));
	if (amounts.length === 0) return /bez\s*maksas|bezmaksas|ieeja\s+br[iī]va/i.test(clean) ? { free: true } : {};
	const min = Math.min(...amounts);
	const max = Math.max(...amounts);
	if (max === 0) return { free: true };
	return max > min ? { priceMin: min, priceMax: max } : { priceMin: min };
}

/** Latvian month abbreviations as printed by the sources: "Nov", "Mai", "Jūn". */
const SHORT_MONTHS = ['jan', 'feb', 'mar', 'apr', 'mai', 'jūn', 'jūl', 'aug', 'sep', 'okt', 'nov', 'dec'];
export function monthFromShort(word: string): number | undefined {
	const index = SHORT_MONTHS.indexOf(cleanText(word).toLowerCase().replace(/\.$/, '').slice(0, 3));
	return index >= 0 ? index + 1 : undefined;
}
