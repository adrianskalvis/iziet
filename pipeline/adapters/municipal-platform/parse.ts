import type { RawEvent } from '../../../src/lib/shared/types';
import { rigaIso } from '../../../src/lib/shared/time';
import { monthFromWord } from '../../lib/dates';
import { absoluteUrl, cheerio, cleanText, truncate } from '../../lib/html';
import { cleanTitle, MAX_DESCRIPTION, splitVenue } from '../regional-venues/common';

/** Parser for the calendar list view of the shared state municipal platform (Drupal). */

export interface Municipality {
	slug: string;
	name: string;
	host: string;
	/** Town shown for events when the listing gives no better one. */
	town: string;
}

interface Ymd {
	year: number;
	month: number;
	day: number;
}

export interface DateRange {
	start: Ymd;
	end?: Ymd;
}

/**
 * Reads "4. novembris, 2026", "3.–17. novembris, 2026" and
 * "23. oktobris, 2026 – 14. novembris, 2026". Missing month and year come from the other end.
 */
export function parseDateRange(text: string): DateRange | undefined {
	const parts = cleanText(text)
		.split(/\s*[–—-]\s*/)
		.filter(Boolean)
		.map((part) => part.match(/^(\d{1,2})\.\s*([\p{L}]+)?,?\s*(\d{4})?\.?$/u));
	if (parts.length === 0 || parts.length > 2 || parts.some((p) => !p)) return undefined;
	const raw = parts.map((p) => ({
		day: Number(p![1]),
		month: p![2] ? monthFromWord(p![2]) : undefined,
		year: p![3] ? Number(p![3]) : undefined
	}));
	const last = raw[raw.length - 1];
	const filled = raw.map((r) => ({ day: r.day, month: r.month ?? last.month, year: r.year ?? last.year }));
	if (filled.some((r) => !r.month || !r.year)) return undefined;
	const toYmd = (r: (typeof filled)[number]): Ymd => ({ year: r.year!, month: r.month!, day: r.day });
	const start = toYmd(filled[0]);
	const end = filled.length > 1 ? toYmd(filled[1]) : undefined;
	return { start, end };
}

export interface TimeRange {
	allDay: boolean;
	start?: { hour: number; minute: number };
	end?: { hour: number; minute: number };
}

/** Reads "10.00–18.00", "19.00" and "Visu dienu". */
export function parseTimeRange(text: string): TimeRange {
	const times = [...cleanText(text).matchAll(/\b([01]?\d|2[0-3])[.:]([0-5]\d)\b/g)].map((m) => ({
		hour: Number(m[1]),
		minute: Number(m[2])
	}));
	if (times.length === 0) return { allDay: true };
	return { allDay: false, start: times[0], end: times[1] };
}

const sameDay = (a: Ymd, b: Ymd) => a.year === b.year && a.month === b.month && a.day === b.day;

/** Largest page number in the pager, 0 when there is no pager. */
export function lastPageIndex(html: string): number {
	const $ = cheerio.load(html);
	let max = 0;
	$('nav.pager a[href*="page="]').each((_, a) => {
		const page = Number(($(a).attr('href') ?? '').match(/page=(\d+)/)?.[1] ?? 0);
		if (page > max) max = page;
	});
	return max;
}

/** Events of one list page. `base` is the page URL, used for relative links. */
export function parseCalendar(html: string, muni: Municipality, base: string): RawEvent[] {
	const $ = cheerio.load(html);
	const source = `muni-${muni.slug}`;
	const events: RawEvent[] = [];
	$('div.event').each((_, el) => {
		const node = $(el);
		const link = node.find('.event-title a').first();
		const title = cleanTitle(link.text());
		const range = parseDateRange(node.find('.date-date').first().text());
		if (!title || !range) return;
		const time = parseTimeRange(node.find('.date-time').first().text());
		const { start, end } = range;
		const startIso = time.start
			? rigaIso(start.year, start.month, start.day, time.start.hour, time.start.minute)
			: rigaIso(start.year, start.month, start.day);
		let endIso: string | undefined;
		if (end && !sameDay(start, end)) {
			endIso = time.end
				? rigaIso(end.year, end.month, end.day, time.end.hour, time.end.minute)
				: rigaIso(end.year, end.month, end.day, 23, 59);
		} else if (time.end) {
			endIso = rigaIso(start.year, start.month, start.day, time.end.hour, time.end.minute);
		}

		const href = link.attr('href');
		const url = absoluteUrl(href?.replace(/[?#].*$/, ''), base);
		if (!url) return;
		const slug = new URL(url).pathname.split('/').filter(Boolean).pop() ?? title;

		const place = cleanText(node.find('.describing-field-value').first().text());
		const online = /^tiešsaist/i.test(place);
		const { venueName, address } = online ? {} : splitVenue(place);
		const description = cleanText(node.find('.event-content').first().text());
		const image = node.find('.event-image img').first().attr('src');
		const categories = node
			.find('.event-categories a')
			.map((__, a) => cleanText($(a).text()))
			.get()
			.filter(Boolean);

		events.push({
			source,
			sourceId: `${slug}@${startIso.slice(0, 10)}`,
			url,
			title,
			description: description ? truncate(description, MAX_DESCRIPTION) : undefined,
			start: startIso,
			end: endIso,
			allDay: time.allDay || undefined,
			venueName,
			address,
			town: muni.town,
			image: absoluteUrl(image, base),
			categoryHint: categories.length ? categories : undefined,
			lang: ['lv']
		});
	});
	return events;
}

const MAX_OCCURRENCES = 20;

/**
 * The list shows a multi-day event once per day. Merges entries with the same page URL into one
 * event: earliest entry is the main one, later starts go to `occurrences`.
 */
export function mergeDailyEntries(events: RawEvent[]): RawEvent[] {
	const byUrl = new Map<string, RawEvent[]>();
	for (const event of events) byUrl.set(event.url, [...(byUrl.get(event.url) ?? []), event]);
	return [...byUrl.entries()].map(([url, group]) => {
		const sorted = [...group].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
		const [first, ...rest] = sorted;
		const slug = new URL(url).pathname.split('/').filter(Boolean).pop() ?? first.sourceId;
		const occurrences = [...new Set(rest.map((event) => event.start))].slice(0, MAX_OCCURRENCES);
		return { ...first, sourceId: slug, occurrences: occurrences.length ? occurrences : undefined };
	});
}
