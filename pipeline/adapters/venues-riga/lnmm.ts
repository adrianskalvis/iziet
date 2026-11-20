import type { CategoryId, RawEvent } from '../../../src/lib/shared/types';
import { absoluteUrl, cheerio, cleanText } from '../../lib/html';
import { fixShoutingTitle, isoFrom, notEnded, readTime, withinHorizon } from './common';

export const LNMM_ID = 'lnmm';
export const LNMM_BASE = 'https://lnmm.gov.lv';
export const LNMM_CALENDAR = `${LNMM_BASE}/kalendars`;
const END_OF_DAY = { hour: 23, minute: 59 };

/** Museums with an address I could confirm from the sources. Others get the town only. */
const ADDRESSES: Record<string, string> = {
	'Latvijas Nacionālais mākslas muzejs': 'Jaņa Rozentāla laukums 1, Rīga',
	'Mākslas muzejs RĪGAS BIRŽA': 'Doma laukums 6, Rīga',
	'Dekoratīvās mākslas un dizaina muzejs': 'Skārņu iela 10/20, Rīga',
	'Mākslas muzejs ARSENĀLS': 'Torņa iela 1, Rīga'
};

export interface LnmmItem {
	url: string;
	title: string;
	/** "Izstāde", "Lekcija", "Meistarklase" */
	kind?: string;
	museum: string;
	start: string;
	end?: string;
	allDay: boolean;
	registrationClosed: boolean;
	image?: string;
}

/** "Lekcija:<br/>Eksperimenta sākotne" gives kind "Lekcija" and title "Eksperimenta sākotne". */
export function splitTitle(anchorHtml: string): { kind?: string; title: string } {
	const $ = cheerio.load(`<a>${anchorHtml}</a>`);
	const anchor = $('a').first();
	const strong = anchor.find('strong').first();
	if (strong.length === 0) return { title: cleanText(anchor.text()) };
	const title = cleanText(strong.text());
	strong.remove();
	const kind = cleanText(anchor.text()).replace(/:$/, '');
	return { kind: kind || undefined, title };
}

function parseDates(text: string): Pick<LnmmItem, 'start' | 'end' | 'allDay'> | undefined {
	const dates = [...text.matchAll(/(\d{1,2})\.(\d{1,2})\.(\d{4})/g)];
	if (dates.length === 0) return undefined;
	const time = text.includes('-') && dates.length > 1 ? undefined : readTime(text.replace(/\d{1,2}\.\d{1,2}\.\d{4}\.?/g, ''));
	const first = dates[0];
	const last = dates[dates.length - 1];
	const start = isoFrom(+first[3], +first[2], +first[1], time);
	const end = dates.length > 1 ? isoFrom(+last[3], +last[2], +last[1], END_OF_DAY) : undefined;
	return { start, end, allDay: !time };
}

/**
 * /kalendars lists seven months of exhibitions and events in one GET. A
 * long exhibition repeats in every month it covers, so items are de-duplicated by URL.
 */
export function parseLnmmCalendar(html: string): LnmmItem[] {
	const $ = cheerio.load(html);
	const seen = new Set<string>();
	const items: LnmmItem[] = [];
	$('.calendar-list .item').each((_, element) => {
		const node = $(element);
		const link = node.find('h3 a').first();
		const url = absoluteUrl(link.attr('href'), LNMM_BASE);
		const dateText = cleanText(node.find('.datetime').first().text());
		const dates = parseDates(dateText);
		if (!url || !dates || seen.has(url)) return;
		seen.add(url);
		const { kind, title } = splitTitle(link.html() ?? '');
		const srcset = node.find('img').first().attr('srcset')?.split(' ')[0];
		items.push({
			url,
			title,
			kind,
			museum: cleanText(node.find('a.museums').first().text()),
			...dates,
			registrationClosed: /pieteikšanās noslēgusies/i.test(dateText),
			image: absoluteUrl(srcset || node.find('img').first().attr('src'), LNMM_BASE)
		});
	});
	return items;
}

function categoryFor(item: LnmmItem): CategoryId {
	if (item.url.includes('/izstades/')) return 'izstades';
	if (/darbnic|meistarklas/i.test(`${item.url} ${item.kind ?? ''}`)) return 'darbnicas';
	return 'izstades';
}

export function lnmmEvents(items: LnmmItem[], now: Date, horizonDays: number): RawEvent[] {
	return items
		.filter((item) => notEnded(item.start, item.end, now) && withinHorizon(item.start, now, horizonDays))
		.map((item) => {
			const knownMuseum = item.museum in ADDRESSES;
			return {
				source: LNMM_ID,
				sourceId: new URL(item.url).pathname.split('/').filter(Boolean).pop() ?? item.url,
				url: item.url,
				title: fixShoutingTitle(item.title),
				start: item.start,
				end: item.end,
				allDay: item.allDay || undefined,
				venueName: item.museum || undefined,
				address: ADDRESSES[item.museum],
				town: knownMuseum ? 'Rīga' : undefined,
				image: item.image,
				categoryHint: item.kind ? [item.kind] : undefined,
				defaultCategory: categoryFor(item)
			};
		});
}
