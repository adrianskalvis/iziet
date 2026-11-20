import type { RawEvent } from '../../../src/lib/shared/types';
import { cheerio, cleanText, truncate } from '../../lib/html';
import { clock, inWindow, splitOccurrences, windowFor } from './util';

export const KALNCIEMS_SOURCE = 'niche-kalnciems';
export const KALNCIEMS_ORIGIN = 'https://www.kalnciemaiela.lv';
const DESCRIPTION_MAX = 600;
const VENUE = { name: 'Kalnciema kvartāls', address: 'Kalnciema iela 35', town: 'Rīga', lat: 56.9431852, lng: 24.0668447 };

export interface KalnciemsEntry {
	url: string;
	title: string;
}

export interface KalnciemsDetail {
	description?: string;
}

/** Days of the month grid that carry the "event" class, as "YYYY-MM-DD". */
export function parseEventDays(html: string): string[] {
	const $ = cheerio.load(html);
	return $('#calendar ul.dates li')
		.filter((_, li) => /\bevent\b/.test($(li).attr('class') ?? ''))
		.map((_, li) => $(li).attr('data-datums') ?? '')
		.get()
		.filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day));
}

/** The site writes "/aktualiates/" in day lists but serves "/aktualitates/". */
export function fixEntryUrl(href: string): string {
	const url = new URL(href, KALNCIEMS_ORIGIN);
	url.pathname = url.pathname.replace('/aktualiates/', '/aktualitates/');
	if (!url.pathname.endsWith('/')) url.pathname += '/';
	return url.toString();
}

/** Parses the per-day fragment: "2026-11-21<a href='...'>Title</a><br />". */
export function parseDayEntries(fragment: string): KalnciemsEntry[] {
	const $ = cheerio.load(fragment);
	return $('a')
		.map((_, a) => ({ url: fixEntryUrl($(a).attr('href') ?? ''), title: cleanText($(a).text()) }))
		.get()
		.filter((entry) => entry.title && entry.url.startsWith(KALNCIEMS_ORIGIN));
}

const FUNDING_NOTE = /ESF\+|finansējum|identifikācijas/i;
const DATE_LINE = /^\d{4}\.\d{2}\.\d{2}\.?$/;

export function parseDetail(html: string): KalnciemsDetail {
	const $ = cheerio.load(html);
	const paragraphs = $('#posttext p')
		.map((_, p) => cleanText($(p).text()))
		.get()
		.filter((text) => text && !DATE_LINE.test(text) && !FUNDING_NOTE.test(text) && !/^\*?Programma var tikt/i.test(text));
	const text = paragraphs.join(' ');
	return { description: text && !/Informācija nav pieejama/i.test(text) ? truncate(text, DESCRIPTION_MAX) : undefined };
}

/** Groups calendar days by entry link: one RawEvent per entry, later days as occurrences. */
export function buildKalnciemsEvents(
	daysByUrl: Map<string, { title: string; days: string[] }>,
	details: Map<string, KalnciemsDetail>,
	now: Date,
	horizonDays: number
): RawEvent[] {
	const window = windowFor(now, horizonDays);
	const events: RawEvent[] = [];
	for (const [url, entry] of daysByUrl) {
		const detail = details.get(url) ?? {};
		// Detail pages mix opening hours with one-off exceptions, so hours are never copied to the days.
		const slots = entry.days
			.map((day) => ({ start: clock(day, '00:00'), end: clock(day, '23:59') }))
			.filter((slot) => inWindow(window, slot.start, slot.end));
		if (slots.length === 0) continue;
		const { start, occurrences } = splitOccurrences(slots.map((s) => s.start));
		events.push({
			source: KALNCIEMS_SOURCE,
			sourceId: url,
			url,
			title: entry.title,
			description: detail.description,
			start,
			end: slots.find((s) => s.start === start)?.end,
			allDay: true,
			occurrences,
			venueName: VENUE.name,
			address: VENUE.address,
			town: VENUE.town,
			lat: VENUE.lat,
			lng: VENUE.lng,
			categoryHint: [entry.title],
			lang: ['lv'],
			status: 'scheduled',
			defaultCategory: 'tirdzini'
		});
	}
	return events;
}
