import type { RawEvent } from '../../../src/lib/shared/types';
import { absoluteUrl, cheerio, cleanText } from '../../lib/html';
import {
	fixShoutingTitle,
	isoFrom,
	plainText,
	productionToEvent,
	readTime,
	type ProductionBase,
	type Show
} from './common';

export const OPERA_ID = 'opera';
export const OPERA_BASE = 'https://www.opera.lv';
const ADDRESS = 'Aspazijas bulvāris 3, Rīga';
const VENUE = 'Latvijas Nacionālā opera un balets';

export interface OperaEntry {
	url: string;
	title: string;
	/** "Balets visai ģimenei divos cēlienos" */
	kind?: string;
	author?: string;
	hall?: string;
	labels: string[];
	image?: string;
	show: Show;
}

export function operaMonthUrl(year: number, month: number): string {
	return `${OPERA_BASE}/lv/kalendars/${year}/${month}/0/list`;
}

/** One calendar month: one entry per performance. The month and year come from the URL. */
export function parseOperaMonth(html: string, year: number, month: number): OperaEntry[] {
	const $ = cheerio.load(html);
	const entries: OperaEntry[] = [];
	$('article[data-role="calendar-block-event"]').each((_, element) => {
		const node = $(element);
		const day = Number(cleanText(node.find('.calendar-list-entry__date figure').first().text()));
		const times = cleanText(node.find('.calendar-list-entry__day time').first().text()).split(/[–-]/);
		const link = node.find('.calendar-list-entry__title a').first();
		const url = absoluteUrl(link.attr('href'), OPERA_BASE);
		const title = cleanText(link.text());
		if (!day || !url || !title) return;
		const startTime = readTime(times[0]);
		const endTime = readTime(times[1]);
		const ticket = node.find('.calendar-list-entry__tickets a[href^="http"]').first().attr('href');
		const soldOut = node.find('.calendar-list-entry__tickets a.disabled').length > 0 && !ticket;
		const start = isoFrom(year, month, day, startTime);
		entries.push({
			url,
			title,
			kind: cleanText(node.find('.calendar-list-entry__data > small').first().text()) || undefined,
			author: cleanText(node.find('.calendar-list-entry__author').first().text()) || undefined,
			hall: node.find('.calendar-list-entry__content i.icon-square').attr('title') || undefined,
			labels: node
				.find('.calendar-list-entry__label .label')
				.map((_i, label) => cleanText($(label).text()))
				.get(),
			image: absoluteUrl(node.find('.calendar-list-entry__img').attr('data-bg'), OPERA_BASE),
			show: {
				start,
				end: startTime && endTime ? isoFrom(year, month, day, endTime) : undefined,
				ticketUrl: ticket ? absoluteUrl(ticket, OPERA_BASE) : undefined,
				soldOut
			}
		});
	});
	return entries;
}

/** One RawEvent per production, with every later performance as an occurrence. */
export function operaEvents(entries: OperaEntry[], now: Date, horizonDays: number): RawEvent[] {
	const byProduction = new Map<string, OperaEntry[]>();
	for (const entry of entries) byProduction.set(entry.url, [...(byProduction.get(entry.url) ?? []), entry]);
	const events: RawEvent[] = [];
	for (const [url, group] of byProduction) {
		const first = group[0];
		const isConcert = /koncert/i.test(first.kind ?? '');
		const base: ProductionBase = {
			source: OPERA_ID,
			sourceId: new URL(url).pathname.split('/').filter(Boolean).pop() ?? url,
			url,
			title: fixShoutingTitle(first.title),
			description: plainText([first.kind, first.author].filter(Boolean).join('. ')),
			venueName: first.hall ? `${VENUE}, ${first.hall}` : VENUE,
			address: ADDRESS,
			town: 'Rīga',
			image: first.image,
			categoryHint: [first.kind, ...group.flatMap((entry) => entry.labels)].filter((hint): hint is string => !!hint),
			defaultCategory: isConcert ? 'koncerti' : 'teatris'
		};
		const event = productionToEvent(
			base,
			group.map((entry) => entry.show),
			now,
			horizonDays
		);
		if (event) events.push(event);
	}
	return events;
}
