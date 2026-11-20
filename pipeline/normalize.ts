import { createHash } from 'node:crypto';
import { CATEGORY_RULES, TAGS } from '../src/lib/shared/categories';
import { fold } from '../src/lib/shared/fold';
import type { CategoryId, EventItem, RawEvent } from '../src/lib/shared/types';
import { rigaParts } from '../src/lib/shared/time';
import { safeHttpsUrl, safeHttpUrl } from '../src/lib/shared/url';
import { htmlToText, stripTracking, truncate } from './lib/html';
import { apkaimeAt, placeAt, placeFromText } from './places';

const MAX_DESC = 280;
const MAX_TIMES = 20;
const LANG_CODES: Record<string, string> = { lv: 'lv', lav: 'lv', ru: 'ru', rus: 'ru', en: 'en', eng: 'en', ltg: 'ltg' };

export function eventId(source: string, sourceId: string): string {
	return createHash('sha1').update(`${source}:${sourceId}`).digest('base64url').slice(0, 11);
}

/** Converts an all-caps title to sentence case; leaves mixed case alone. */
export function tidyTitle(title: string): string {
	const clean = title.replace(/\s+/g, ' ').replace(/^["'«„“]+|["'»“”]+$/g, '').trim();
	const letters = clean.replace(/[^\p{L}]/gu, '');
	const upper = letters.replace(/[^\p{Lu}]/gu, '');
	if (letters.length > 6 && upper.length / letters.length > 0.8) {
		const lower = clean.toLocaleLowerCase('lv-LV');
		return lower.charAt(0).toLocaleUpperCase('lv-LV') + lower.slice(1);
	}
	return clean;
}

function countHits(text: string, keywords: string[]): number {
	return keywords.reduce((sum, keyword) => sum + (text.includes(keyword) ? 1 : 0), 0);
}

/** Weighted keyword vote: title 3, source category labels 2, description 1. */
export function classify(raw: RawEvent): CategoryId {
	if (raw.category) return raw.category;
	const title = ` ${fold(raw.title)} `;
	const hints = ` ${fold((raw.categoryHint ?? []).join(' '))} `;
	const desc = ` ${fold((raw.description ?? '').slice(0, 400))} `;
	let best: { id: CategoryId; score: number } | undefined;
	for (const rule of CATEGORY_RULES) {
		const score = 3 * countHits(title, rule.keywords) + 2 * countHits(hints, rule.keywords) + countHits(desc, rule.keywords);
		if (score > 0 && (!best || score > best.score)) best = { id: rule.id, score };
	}
	if (!raw.defaultCategory) return best?.id ?? 'festivali';
	// A single-category source (cinema, theatre) keeps its category unless the title itself says otherwise.
	const titleHits = best ? countHits(title, CATEGORY_RULES.find((rule) => rule.id === best!.id)!.keywords) : 0;
	return best && titleHits > 0 ? best.id : raw.defaultCategory;
}

export function detectTags(raw: RawEvent): string[] {
	const text = ` ${fold([raw.title, ...(raw.categoryHint ?? []), (raw.description ?? '').slice(0, 400)].join(' '))} `;
	const found = TAGS.filter((tag) => tag.keywords.some((keyword) => text.includes(keyword))).map((tag) => tag.id);
	return [...new Set([...(raw.tags ?? []), ...found])];
}

function normaliseLang(codes: string[] | undefined): string[] | undefined {
	const mapped = [...new Set((codes ?? []).map((code) => LANG_CODES[code.toLowerCase().slice(0, 3)] ?? LANG_CODES[code.toLowerCase().slice(0, 2)]).filter(Boolean))];
	return mapped.length ? mapped : undefined;
}

function isFamily(raw: RawEvent, cat: CategoryId): boolean {
	if (cat === 'gimenem') return true;
	if (raw.ageMax !== undefined && raw.ageMax <= 14) return true;
	return /\b(bern|gimen|family|kids|children)/.test(fold(`${raw.title} ${(raw.categoryHint ?? []).join(' ')}`));
}

function isAdult(raw: RawEvent): boolean {
	return (raw.ageMin ?? 0) >= 18 || /(^|\D)18\s*\+/.test(`${raw.title} ${raw.description ?? ''}`);
}

export interface NormalizeContext {
	sourceName: string;
	now: Date;
}

/** RawEvent → EventItem, or undefined when the event cannot be placed or dated. */
export function normalize(raw: RawEvent, ctx: NormalizeContext): EventItem | undefined {
	const title = tidyTitle(raw.title ?? '');
	if (!title || !raw.start || Number.isNaN(Date.parse(raw.start))) return undefined;
	const pageUrl = safeHttpUrl(raw.url);
	if (!pageUrl) return undefined;

	const point = raw.lat !== undefined && raw.lng !== undefined && Number.isFinite(raw.lat) && Number.isFinite(raw.lng) ? { lat: raw.lat, lng: raw.lng } : undefined;
	const validPoint = point && point.lat > 55.5 && point.lat < 58.2 && point.lng > 20.8 && point.lng < 28.4 ? point : undefined;
	const place = validPoint ? placeAt(validPoint) : placeFromText(raw.town, raw.address, raw.venueName);
	if (!place && !raw.town) return undefined;
	const location = validPoint ?? (place ? { lat: place.lat, lng: place.lng } : undefined);

	const cat = classify(raw);
	const nowMs = ctx.now.getTime();
	const times = [...new Set(raw.occurrences ?? [])]
		.filter((iso) => iso !== raw.start && Date.parse(iso) > nowMs)
		.sort()
		.slice(0, MAX_TIMES);
	const tickets = [...new Map((raw.tickets ?? []).flatMap((t) => { const safe = safeHttpUrl(t.url); return safe ? [[stripTracking(safe), { seller: t.seller, url: stripTracking(safe) }] as const] : []; })).values()];
	const desc = raw.description ? truncate(htmlToText(raw.description), MAX_DESC) : undefined;
	const price =
		raw.free || raw.priceMin !== undefined
			? { ...(raw.free ? { free: true } : {}), ...(raw.priceMin !== undefined ? { min: raw.priceMin } : {}), ...(raw.priceMax !== undefined && raw.priceMax !== raw.priceMin ? { max: raw.priceMax } : {}) }
			: undefined;

	const startParts = rigaParts(raw.start);
	const endParts = raw.end ? rigaParts(raw.end) : undefined;
	const midnightStart = startParts.hour === 0 && startParts.minute === 0;
	const allDay = raw.allDay || (midnightStart && (!endParts || (endParts.hour === 0 && endParts.minute === 0) || (endParts.hour === 23 && endParts.minute === 59)));

	const item: EventItem = {
		id: eventId(raw.source, raw.sourceId),
		title,
		cat,
		tags: detectTags(raw),
		start: raw.start,
		tickets,
		url: pageUrl,
		sources: [{ id: raw.source, name: ctx.sourceName, url: pageUrl }],
		town: place?.name ?? raw.town!.trim()
	};
	if (desc) item.desc = desc;
	if (raw.end && Date.parse(raw.end) >= Date.parse(raw.start)) item.end = raw.end;
	if (allDay) item.allDay = true;
	if (times.length) item.times = times;
	if (raw.venueName) item.venue = raw.venueName.trim();
	if (raw.address) item.address = raw.address.trim();
	if (place) item.placeId = place.q;
	if (location) {
		item.lat = Math.round(location.lat * 1e5) / 1e5;
		item.lng = Math.round(location.lng * 1e5) / 1e5;
		if (!validPoint) item.approx = true;
		const apkaime = place?.name === 'Rīga' && validPoint ? apkaimeAt(validPoint) : undefined;
		if (apkaime) item.apkaime = apkaime;
	}
	if (price) item.price = price;
	const image = safeHttpsUrl(raw.image);
	if (image) item.img = image;
	if (raw.imageWidth && raw.imageHeight) Object.assign(item, { imgW: raw.imageWidth, imgH: raw.imageHeight });
	const lang = normaliseLang(raw.lang);
	if (lang) item.lang = lang;
	if (raw.ageMin !== undefined) item.ageMin = raw.ageMin;
	if (raw.ageMax !== undefined) item.ageMax = raw.ageMax;
	if (isFamily(raw, cat)) item.family = true;
	if (isAdult(raw)) item.adult = true;
	if (raw.status && raw.status !== 'scheduled') item.status = raw.status;
	return item;
}
