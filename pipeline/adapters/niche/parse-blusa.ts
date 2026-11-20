import type { RawEvent } from '../../../src/lib/shared/types';
import { cleanText, truncate } from '../../lib/html';
import { clock, inWindow, splitOccurrences, windowFor } from './util';

export const BLUSA_ORIGIN = 'https://blusa.eu';
export const BLUSA_SOURCE = 'niche-blusa';
const DESCRIPTION_MAX = 600;

export interface BlusaMarket {
	id: number;
	title: string;
	description?: string | null;
	start_date: string;
	end_date: string;
	start_time?: string | null;
	end_time?: string | null;
	city?: string | null;
	address?: string | null;
	location_name?: string | null;
	latitude?: string | null;
	longitude?: string | null;
	source_type?: string;
	market_type_name?: string | null;
	external_url?: string | null;
	entry_fee?: string | number | null;
	is_recurring?: boolean;
	recurrence_details?: Array<{ start_date: string; end_date: string }> | null;
	is_cancelled?: boolean;
	cancelled_occurrences?: unknown[] | null;
}

interface BlusaResponse {
	success?: boolean;
	markets?: BlusaMarket[];
}

export function parseBlusaMarkets(json: string): BlusaMarket[] {
	const data = JSON.parse(json) as BlusaResponse;
	return Array.isArray(data.markets) ? data.markets : [];
}

function pickDefined<T extends object>(value: T): Partial<T> {
	return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== null && v !== undefined)) as Partial<T>;
}

/** The public list has no opening hours or fees; the "upcoming" list has them for some markets. */
export function mergeBlusaDetails(publicList: BlusaMarket[], upcoming: BlusaMarket[]): BlusaMarket[] {
	const details = new Map(upcoming.map((m) => [m.id, m]));
	return publicList.map((m) => {
		const extra = details.get(m.id);
		return extra ? { ...m, ...pickDefined(extra) } : m;
	});
}

/** Removes e-mail addresses, phone numbers and the "checked on" line. */
export function cleanBlusaDescription(text: string | null | undefined): string | undefined {
	if (!text) return undefined;
	const personal = /Informācija pārbaudīta|Kas organizē|Rīko\s*:|Organizators|Kontaktpersona|tālr|\btel\b|e-?pasts|@|\+?\d[\d ()-]{7,}\d/i;
	const cleaned = cleanText(
		text
			.split('\n')
			.filter((line) => !personal.test(line))
			.join('\n')
	);
	return cleaned ? truncate(cleaned, DESCRIPTION_MAX) : undefined;
}

const FLEA_TYPES = /krāmu|bluš/i;

function categoryFor(market: BlusaMarket): 'blusu' | 'tirdzini' {
	return FLEA_TYPES.test(`${market.market_type_name ?? ''} ${market.title}`) ? 'blusu' : 'tirdzini';
}

function cancelledDays(market: BlusaMarket): Set<string> {
	const days = (market.cancelled_occurrences ?? []).map((entry) => {
		if (typeof entry === 'string') return entry.slice(0, 10);
		if (entry && typeof entry === 'object') {
			const record = entry as Record<string, unknown>;
			const value = record.start_date ?? record.date;
			return typeof value === 'string' ? value.slice(0, 10) : '';
		}
		return '';
	});
	return new Set(days.filter(Boolean));
}

function spans(market: BlusaMarket): Array<{ from: string; to: string }> {
	const details = market.recurrence_details ?? [];
	if (market.is_recurring && details.length > 0) {
		return details.map((d) => ({ from: d.start_date.slice(0, 10), to: d.end_date.slice(0, 10) }));
	}
	return [{ from: market.start_date.slice(0, 10), to: market.end_date.slice(0, 10) }];
}

function hhmm(value: string | null | undefined): string | undefined {
	return value && /^\d{2}:\d{2}/.test(value) ? value.slice(0, 5) : undefined;
}

export function blusaToRaw(market: BlusaMarket, now: Date, horizonDays: number): RawEvent | undefined {
	if (market.is_cancelled || !market.title) return undefined;
	const window = windowFor(now, horizonDays);
	const skip = cancelledDays(market);
	const startTime = hhmm(market.start_time);
	const endTime = hhmm(market.end_time);

	const items = spans(market)
		.filter((span) => !skip.has(span.from))
		.map((span) => ({
			start: clock(span.from, startTime ?? '00:00'),
			end: clock(span.to, startTime ? (endTime ?? startTime) : '23:59')
		}))
		.filter((item) => inWindow(window, item.start, item.end));
	if (items.length === 0) return undefined;

	const { start, occurrences } = splitOccurrences(items.map((i) => i.start));
	const end = items.find((i) => i.start === start)?.end;
	const official = market.source_type === 'scraped';
	const fee = market.entry_fee === null || market.entry_fee === undefined ? undefined : Number(market.entry_fee);
	const hasFee = fee !== undefined && Number.isFinite(fee);
	const lat = Number(market.latitude);
	const lng = Number(market.longitude);

	return {
		source: BLUSA_SOURCE,
		sourceId: String(market.id),
		url: `${BLUSA_ORIGIN}/markets/${official ? 'official/' : ''}${market.id}`,
		title: cleanText(market.title),
		description: cleanBlusaDescription(market.description),
		start,
		end,
		allDay: startTime ? undefined : true,
		occurrences,
		venueName:
			market.location_name && cleanText(market.location_name) !== cleanText(market.address ?? '')
				? cleanText(market.location_name)
				: undefined,
		address: market.address ? cleanText(market.address) : undefined,
		town: market.city ? cleanText(market.city) : undefined,
		lat: Number.isFinite(lat) && lat !== 0 ? lat : undefined,
		lng: Number.isFinite(lng) && lng !== 0 ? lng : undefined,
		free: hasFee && fee === 0 ? true : undefined,
		priceMin: hasFee ? fee : undefined,
		priceMax: hasFee ? fee : undefined,
		categoryHint: market.market_type_name ? [market.market_type_name] : undefined,
		lang: ['lv'],
		status: 'scheduled',
		defaultCategory: categoryFor(market)
	};
}
