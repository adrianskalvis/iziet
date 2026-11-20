import type { RawEvent } from '../../../src/lib/shared/types';
import { parsePrice } from '../../lib/price';
import { absoluteUrl, cheerio, cleanText } from '../../lib/html';
import { fixShoutingTitle, isoFrom, notEnded, plainText, readTime, sellerName, withinHorizon } from './common';

export const HANZAS_ID = 'hanzas-perons';
export const HANZAS_LIST = 'https://hanzasperons.lv/visi-pasakumi/';
const ADDRESS = 'Hanzas iela 16a, Rīga';
/** Site tags that carry no category: year, month, "new", venue slug. */
const NOISE_TERM =
	/^(jaunakie-lv|new-lv|hanzas-perons|20\d{2}|(janvaris|februaris|marts|aprilis|maijs|junijs|julijs|augusts|septembris|oktobris|novembris|decembris)(-\d+)?|(january|february|march|april|may|june|july|august|september|october|november|december)-lv|marts-\d+)$/;

export interface HanzasItem {
	url: string;
	title: string;
	year: number;
	month: number;
	day: number;
	/** "Ieeja no:19:00" */
	entrance?: string;
	/** "Cena:Biļetes cena: no 25 EUR" */
	price?: string;
	categories: string[];
}

/** The calendar block on /visi-pasakumi/ lists every event, past ones too, twice (desktop and mobile). */
export function parseHanzasList(html: string): HanzasItem[] {
	const $ = cheerio.load(html);
	const seen = new Set<string>();
	const items: HanzasItem[] = [];
	$('.qcc-day-event').each((_, element) => {
		const node = $(element);
		const url = absoluteUrl(node.attr('link'), HANZAS_LIST);
		const year = Number(node.attr('date-year'));
		const month = Number(node.attr('date-month'));
		const day = Number(node.attr('date-day'));
		if (!url || !year || !month || !day) return;
		const key = `${url}#${year}-${month}-${day}`;
		if (seen.has(key)) return;
		seen.add(key);
		items.push({
			url,
			title: cleanText(node.attr('title')),
			year,
			month,
			day,
			entrance: node.attr('entrance'),
			price: node.attr('price'),
			categories: cleanText(node.attr('category'))
				.split(' ')
				.filter((term) => term && !NOISE_TERM.test(term))
		});
	});
	return items;
}

export function hanzasStart(item: HanzasItem): string {
	return isoFrom(item.year, item.month, item.day, readTime(item.entrance));
}

/** Upcoming items only, so detail pages (about 700 KB each) are fetched for the ones that matter. */
export function upcomingHanzasItems(items: HanzasItem[], now: Date, horizonDays: number): HanzasItem[] {
	return items.filter((item) => {
		const start = hanzasStart(item);
		return notEnded(start, undefined, now) && withinHorizon(start, now, horizonDays);
	});
}

/** Event page: description, image, ticket link. Date, doors time and price come from the list. */
export function parseHanzasDetail(html: string, item: HanzasItem): RawEvent {
	const $ = cheerio.load(html);
	const time = readTime(item.entrance);
	const priceText = cleanText(item.price).replace(/^Cena:\s*/i, '');
	const price = parsePrice(priceText);
	const ticketUrl = absoluteUrl($('.event-aside__action a[href]').first().attr('href'), item.url);
	const description = $('.text_block .oxy-stock-content-styles p, .oxy-stock-content-styles p')
		.map((_, p) => cleanText($(p).text()))
		.get()
		.filter(Boolean)
		.join(' ');
	const subtitle = cleanText($('.single-subtitle').first().text());
	const start = hanzasStart(item);
	const slug = new URL(item.url).pathname.split('/').filter(Boolean).pop() ?? item.url;
	return {
		source: HANZAS_ID,
		sourceId: `${slug}-${start.slice(0, 10)}`,
		url: item.url,
		title: fixShoutingTitle(item.title),
		description: plainText(description || subtitle || $('meta[property="og:description"]').attr('content')),
		start,
		allDay: time ? undefined : true,
		venueName: 'Hanzas Perons',
		address: ADDRESS,
		town: 'Rīga',
		priceMin: price?.min,
		priceMax: price?.max,
		free: price?.free || undefined,
		tickets: ticketUrl ? [{ seller: sellerName(ticketUrl), url: ticketUrl }] : undefined,
		image: absoluteUrl($('meta[property="og:image"]').attr('content'), item.url),
		categoryHint: item.categories
	};
}
