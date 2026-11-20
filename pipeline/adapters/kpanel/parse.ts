import type { RawEvent } from '../../../src/lib/shared/types';
import { rigaIso } from '../../../src/lib/shared/time';
import { monthFromWord } from '../../lib/dates';
import { absoluteUrl, cheerio, cleanText, htmlToText } from '../../lib/html';
import { parsePrice } from '../../lib/price';
import { defined, priceFromText, statusFromTitle } from '../jsonld-sites/common';

/**
 * KPanel CMS event sites (visit.jekabpils.lv, visit.bauska.lv). Event URL scheme:
 * /lv/<section>/YYYY-MM-DD/[ID-]slug/. Two templates exist: an older Bootstrap one
 * (Jēkabpils) and a custom "vb-" one (Bauska). Both are read here.
 */

export interface KpanelSite {
	id: string;
	name: string;
	homepage: string;
	/** Site origin, for example https://visit.jekabpils.lv. */
	origin: string;
	/** Path of the event list, for example /lv/visi-pasakumi/. */
	listPath: string;
	town: string;
}

export interface DayParts {
	year: number;
	month: number;
	day: number;
}

export interface ListingEntry {
	url: string;
	title?: string;
	/** Start day from the URL. */
	date: DayParts;
	/** Last day of a multi-day event. */
	endDate?: DayParts;
	time?: string;
	category?: string;
	image?: string;
	place?: string;
}

const EVENT_PATH = /pasakumi\/(\d{4})-(\d{2})-(\d{2})\/([a-z0-9][a-z0-9-]*)\/?$/i;
const TIME = /\b([01]?\d|2[0-3]):([0-5]\d)\b/g;

/** Month names that monthFromWord misses. */
function monthOf(word: string): number | undefined {
	return /^mai$/i.test(word) ? 5 : monthFromWord(word);
}

/** "2026-11-21/1365-tinder-party" from an event URL. */
export function sourceIdOf(url: string): string {
	const match = url.match(EVENT_PATH);
	return match ? `${match[1]}-${match[2]}-${match[3]}/${match[4]}` : url;
}

export function dayFromUrl(url: string): DayParts | undefined {
	const match = url.match(EVENT_PATH);
	return match ? { year: +match[1], month: +match[2], day: +match[3] } : undefined;
}

/** Last day of "1 Nov - 27 Nov", "9.–22. novembris, 2026" or "4. novembris – 30. decembris". */
export function parseRangeEnd(text: string, start: DayParts): DayParts | undefined {
	const dates = text.split('|')[0];
	const parts = dates.split(/\s*[–—-]\s*/);
	if (parts.length < 2) return undefined;
	const right = parts[1].match(/(\d{1,2})\.?\s*([A-Za-zĀ-žā-ž]+)?/u);
	if (!right) return undefined;
	const month = right[2] ? monthOf(right[2]) : start.month;
	if (!month) return undefined;
	const explicitYear = dates.match(/\b(20\d{2})\b/)?.[1];
	const year = explicitYear ? +explicitYear : month < start.month ? start.year + 1 : start.year;
	const end = { year, month, day: +right[1] };
	return end.year * 10_000 + end.month * 100 + end.day > start.year * 10_000 + start.month * 100 + start.day ? end : undefined;
}

/** Start time and optional end time from "16:00" or "10:00 - 18:00". */
export function parseTimes(text: string | undefined): { start?: [number, number]; end?: [number, number] } {
	const found = [...(text ?? '').matchAll(TIME)].map((match) => [+match[1], +match[2]] as [number, number]);
	return { start: found[0], end: found[1] };
}

/** Event links on a list page: every href with the date-in-path scheme, in page order. */
export function listEntries(html: string, pageUrl: string): ListingEntry[] {
	const $ = cheerio.load(html);
	const entries = new Map<string, ListingEntry>();
	$('a[href]').each((_, anchor) => {
		const url = absoluteUrl($(anchor).attr('href'), pageUrl)?.replace(/[?#].*$/, '');
		const date = url ? dayFromUrl(url) : undefined;
		if (!url || !date || entries.has(url)) return;
		const card = $(anchor).closest('.col-event-item, .vb-ecard');
		const scope = card.length ? card : $(anchor).parent();
		const dateText = cleanText(scope.find('.event-times, .vb-ecard-date').first().text());
		const title = cleanText(scope.find('h4, h2.vb-ecard-title').first().text()) || cleanText($(anchor).attr('title'));
		const image = absoluteUrl(scope.find('img').first().attr('src'), pageUrl)?.replace('/middle_', '/large_');
		entries.set(url, {
			url,
			title: title || undefined,
			date,
			endDate: parseRangeEnd(dateText, date),
			time: dateText.includes('|') ? cleanText(dateText.split('|')[1]) : undefined,
			category: cleanText(scope.find('.event-cat-btn').first().text()) || undefined,
			image,
			place: cleanText(scope.find('.vb-ecard-place').first().text()) || undefined
		});
	});
	return [...entries.values()];
}

interface DetailFields {
	title?: string;
	dateText?: string;
	timeText?: string;
	priceText?: string;
	venue?: string;
	address?: string;
	category?: string;
	description?: string;
	image?: string;
}

function readOldTemplate($: cheerio.CheerioAPI, pageUrl: string): DetailFields {
	const place = $('.datetime .place').first();
	const venue = cleanText(place.find('h4').first().text());
	const placeText = cleanText(place.text());
	const poster = $('a.event-poster').attr('href') ?? $('.event-poster img').attr('src');
	return {
		dateText: cleanText($('.datetime .date').first().text()),
		timeText: cleanText($('.datetime .time').first().text()),
		category: cleanText($('.datetime a.category').first().text()),
		venue,
		address: cleanText(venue && placeText.startsWith(venue) ? placeText.slice(venue.length) : placeText),
		description: $('.main-html-content').first().html() ?? undefined,
		image: absoluteUrl(poster, pageUrl)
	};
}

function readNewTemplate($: cheerio.CheerioAPI, pageUrl: string): DetailFields {
	const facts = new Map<string, string>();
	$('.vb-evd-fact').each((_, fact) => {
		facts.set(cleanText($(fact).find('.vb-evd-l').text()).toLowerCase(), cleanText($(fact).find('.vb-evd-v').text()));
	});
	const poster = $('.vb-evd-poster a').attr('href') ?? $('.vb-evd-poster img').attr('src');
	return {
		dateText: facts.get('datums'),
		timeText: facts.get('laiks'),
		priceText: facts.get('cena'),
		venue: facts.get('vieta'),
		description: $('.vb-prose').first().html() ?? undefined,
		image: absoluteUrl(poster, pageUrl)
	};
}

/** Reads one event page. The list entry fills what the page lacks. */
export function parseKpanelEvent(html: string, pageUrl: string, site: KpanelSite, entry?: ListingEntry): RawEvent | undefined {
	const $ = cheerio.load(html);
	const date = dayFromUrl(pageUrl) ?? entry?.date;
	const title = cleanText($('h1').first().text()) || entry?.title;
	if (!date || !title) return undefined;
	const fields = $('.vb-evd-facts').length ? readNewTemplate($, pageUrl) : readOldTemplate($, pageUrl);
	const times = parseTimes(fields.timeText ?? entry?.time);
	const endDate = (fields.dateText ? parseRangeEnd(fields.dateText, date) : undefined) ?? entry?.endDate;

	const start = times.start ? rigaIso(date.year, date.month, date.day, ...times.start) : rigaIso(date.year, date.month, date.day);
	const endDay = endDate ?? date;
	const end = endDate
		? rigaIso(endDay.year, endDay.month, endDay.day, ...(times.end ?? [23, 59]))
		: times.end
			? rigaIso(date.year, date.month, date.day, ...times.end)
			: undefined;
	const description = htmlToText(fields.description);
	const price = parsePrice(fields.priceText);
	const textPrice = priceFromText(description);
	const addressTown = fields.address?.includes(',') ? fields.address.split(',').pop()?.trim() : undefined;

	return {
		source: site.id,
		sourceId: sourceIdOf(pageUrl),
		url: pageUrl,
		title,
		description,
		start,
		end,
		allDay: times.start ? undefined : true,
		venueName: fields.venue || entry?.place,
		address: fields.address || undefined,
		town: addressTown && !/\d|iela/i.test(addressTown) ? addressTown : site.town,
		image: fields.image ?? entry?.image,
		categoryHint: [fields.category || entry?.category].filter((c): c is string => !!c),
		lang: ['lv'],
		status: statusFromTitle(title),
		...defined({ priceMin: price?.min ?? textPrice?.priceMin, priceMax: price?.max, free: price?.free ?? textPrice?.free })
	};
}

/** A RawEvent from list data alone, used when the event page cannot be read. */
export function eventFromEntry(entry: ListingEntry, site: KpanelSite): RawEvent | undefined {
	if (!entry.title) return undefined;
	const times = parseTimes(entry.time);
	const { year, month, day } = entry.date;
	const end = entry.endDate ? rigaIso(entry.endDate.year, entry.endDate.month, entry.endDate.day, 23, 59) : undefined;
	return {
		source: site.id,
		sourceId: sourceIdOf(entry.url),
		url: entry.url,
		title: entry.title,
		start: times.start ? rigaIso(year, month, day, ...times.start) : rigaIso(year, month, day),
		end,
		allDay: times.start ? undefined : true,
		venueName: entry.place,
		town: site.town,
		image: entry.image,
		categoryHint: entry.category ? [entry.category] : undefined,
		lang: ['lv']
	};
}
