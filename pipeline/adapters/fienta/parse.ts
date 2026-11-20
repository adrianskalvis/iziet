import type { EventStatus, RawEvent } from '../../../src/lib/shared/types';
import { parseIsoLoose } from '../../lib/dates';
import { cleanText, htmlToText, truncate } from '../../lib/html';
import { parsePrice } from '../../lib/price';

export const SOURCE_ID = 'fienta';
const DESCRIPTION_MAX = 600;
/** Gift cards and passes run for years; they are not events. */
const MAX_SPAN_DAYS = 120;
const PAST_GRACE_MS = 12 * 3600_000;
const DAY_MS = 86_400_000;

export interface FientaEvent {
	id: number;
	title: string;
	starts_at: string;
	ends_at?: string;
	event_status?: string;
	sale_status?: string;
	attendance_mode?: string;
	venue?: string;
	address?: string;
	description?: string;
	url?: string;
	buy_tickets_url?: string;
	image_url?: string;
	image_small_url?: string;
	organizer_name?: string;
	categories?: string[];
	price_from_string?: string | null;
	// organizer_email and organizer_phone exist in the API and are never read.
}

export interface FientaResponse {
	events?: FientaEvent[];
}

/** Sentence case, only when the whole title is upper case. */
export function fixShoutingTitle(title: string): string {
	const letters = title.replace(/[^\p{L}]/gu, '');
	if (letters.length < 4 || letters !== letters.toUpperCase() || letters === letters.toLowerCase()) return title;
	const lower = title.toLowerCase();
	return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Town from "Stabu iela 42, LV-1011 Rīga" or "Rīga, Latvija". */
export function townFromAddress(address: string | undefined): string | undefined {
	if (!address) return undefined;
	const parts = address
		.split(',')
		.map((part) => cleanText(part.replace(/\b(LV[- ]?)?\d{4}\b/gi, '')))
		.filter((part) => part && !/^latvij[aā]$|^latvia$/i.test(part));
	return parts.length > 1 ? parts[parts.length - 1] : undefined;
}

export function parseFientaPrice(text: string | null | undefined): Pick<RawEvent, 'priceMin' | 'priceMax' | 'free'> {
	if (!text) return {};
	if (/^free$/i.test(text.trim())) return { free: true, priceMin: 0, priceMax: 0 };
	const parsed = parsePrice(text.replace(/\bfree\b/gi, '').replace(/\bfrom\b/gi, ''));
	const hasFreeTier = /\bfree\b/i.test(text);
	if (!parsed || parsed.min === undefined) return hasFreeTier ? { priceMin: 0 } : {};
	return { priceMin: hasFreeTier ? 0 : parsed.min, priceMax: parsed.max ?? (hasFreeTier ? parsed.min : undefined) };
}

function toStatus(event: FientaEvent): EventStatus | undefined {
	if (event.event_status === 'cancelled') return 'cancelled';
	if (event.event_status === 'postponed') return 'postponed';
	if (event.sale_status === 'soldOut') return 'soldout';
	return undefined;
}

export function parseFientaEvents(
	response: FientaResponse,
	now: Date,
	horizonDays: number,
	log: (message: string) => void = () => {}
): RawEvent[] {
	const earliestEnd = now.getTime() - PAST_GRACE_MS;
	const latestStart = now.getTime() + horizonDays * DAY_MS;
	const out: RawEvent[] = [];
	let dropped = 0;
	for (const item of response.events ?? []) {
		const start = parseIsoLoose(item.starts_at);
		const end = parseIsoLoose(item.ends_at);
		const url = item.url ?? item.buy_tickets_url;
		if (!item.title || !start || !url) continue;
		const startMs = Date.parse(start.iso);
		const endMs = end ? Date.parse(end.iso) : startMs;
		if (endMs < earliestEnd || startMs > latestStart || endMs - startMs > MAX_SPAN_DAYS * DAY_MS) {
			dropped++;
			continue;
		}
		const title = fixShoutingTitle(cleanText(item.title));
		const online = item.attendance_mode === 'online';
		const address = cleanText(item.address) || undefined;
		const description = htmlToText(item.description);
		out.push({
			source: SOURCE_ID,
			sourceId: String(item.id),
			url,
			title,
			description: description ? truncate(description, DESCRIPTION_MAX) : undefined,
			start: start.iso,
			end: end && endMs > startMs ? end.iso : undefined,
			allDay: start.allDay || undefined,
			venueName: online ? 'Online' : cleanText(item.venue) || undefined,
			address: online ? undefined : address,
			town: online ? undefined : townFromAddress(address),
			...parseFientaPrice(item.price_from_string),
			tickets: [{ seller: 'Fienta', url: item.buy_tickets_url ?? url }],
			image: item.image_url || item.image_small_url || undefined,
			categoryHint: item.categories?.length ? item.categories : undefined,
			tags: online ? ['online'] : undefined,
			lang: /[Ѐ-ӿ]/.test(title) ? ['ru'] : undefined,
			status: toStatus(item),
			organizer: cleanText(item.organizer_name) || undefined
		});
	}
	log(`fienta: ${out.length} kept, ${dropped} dropped (past, beyond horizon or longer than ${MAX_SPAN_DAYS} days)`);
	return out;
}
