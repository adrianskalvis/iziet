import type { RawEvent } from '../../../src/lib/shared/types';
import { absoluteUrl, cheerio, cleanText } from '../../lib/html';
import {
	fixShoutingTitle,
	inferYear,
	isoFrom,
	monthNumber,
	notEnded,
	plainText,
	readTime,
	sellerName,
	withinHorizon
} from './common';

export const XIAOMI_ID = 'xiaomi-arena';
export const XIAOMI_HOME = 'https://xiaomi-arena.com/';
const ADDRESS = 'Skanstes iela 21, Rīga';

export interface XiaomiItem {
	url: string;
	title: string;
	/** "Svētdiena, 4. jūlijs, 2027" */
	dateText: string;
	category?: string;
	ticketUrl?: string;
	image?: string;
	imageWidth?: number;
	imageHeight?: number;
}

/** Slider on the home page: title, date, category, ticket link, 1140x640 image. */
export function parseXiaomiHome(html: string): XiaomiItem[] {
	const $ = cheerio.load(html);
	const seen = new Set<string>();
	const items: XiaomiItem[] = [];
	$('.swiper-slide').each((_, element) => {
		const slide = $(element);
		const link = slide.find('h2.entry-title a').first();
		const url = absoluteUrl(link.attr('href'), XIAOMI_HOME);
		if (!url || seen.has(url)) return;
		seen.add(url);
		const [dateText, category] = cleanText(slide.find('.date').first().text()).split('•').map(cleanText);
		const image = slide.find('.img_bg').attr('style')?.match(/url\('([^']+)'\)/)?.[1];
		const size = image?.match(/-(\d{3,4})x(\d{3,4})\.\w+$/);
		items.push({
			url,
			title: cleanText(link.text()),
			dateText: dateText ?? '',
			category: category || undefined,
			ticketUrl: absoluteUrl(slide.find('a.active').first().attr('href'), XIAOMI_HOME),
			image,
			imageWidth: size ? Number(size[1]) : undefined,
			imageHeight: size ? Number(size[2]) : undefined
		});
	});
	return items;
}

/** "Svētdiena, 4. jūlijs, 2027" to day, month, year. */
export function parseXiaomiDate(text: string, now: Date): { day: number; month: number; year: number } | undefined {
	const match = text.match(/(\d{1,2})\.\s*(\p{L}+)(?:,?\s*(\d{4}))?/u);
	const month = match ? monthNumber(match[2]) : undefined;
	if (!match || !month) return undefined;
	const day = Number(match[1]);
	return { day, month, year: match[3] ? Number(match[3]) : inferYear(month, day, now) };
}

function detailTime($: cheerio.CheerioAPI, label: string): { hour: number; minute: number } | undefined {
	let value: { hour: number; minute: number } | undefined;
	$('table.event_details tr').each((_, row) => {
		const cells = $(row).find('td');
		if (cells.length === 2 && cleanText(cells.eq(0).text()).toLowerCase().startsWith(label)) {
			value = readTime(cleanText(cells.eq(1).text()));
		}
	});
	return value;
}

/** Event page: start and end time, description. The list item supplies the rest. */
export function parseXiaomiDetail(html: string, item: XiaomiItem, now: Date, horizonDays: number): RawEvent | undefined {
	const $ = cheerio.load(html);
	const date = parseXiaomiDate(cleanText($('.time').first().text()) || item.dateText, now);
	if (!date) return undefined;
	const startTime = detailTime($, 'sākums') ?? detailTime($, 'ieeja');
	const endTime = detailTime($, 'beigas');
	const start = isoFrom(date.year, date.month, date.day, startTime);
	const end = startTime && endTime ? isoFrom(date.year, date.month, date.day, endTime) : undefined;
	if (!notEnded(start, end, now) || !withinHorizon(start, now, horizonDays)) return undefined;

	const paragraphs = $('.contents p')
		.map((_, p) => cleanText($(p).text()))
		.get()
		.filter(Boolean);
	const ticketUrl = item.ticketUrl ?? absoluteUrl($('#pirkt_poga').attr('href'), item.url);
	const title = fixShoutingTitle(item.title || cleanText($('h1').first().text()));
	return {
		source: XIAOMI_ID,
		sourceId: new URL(item.url).pathname.split('/').filter(Boolean).pop() ?? item.url,
		url: item.url,
		title,
		description: plainText(paragraphs.join(' ')),
		start,
		end: end && Date.parse(end) > Date.parse(start) ? end : undefined,
		allDay: startTime ? undefined : true,
		venueName: 'Xiaomi Arēna',
		address: ADDRESS,
		town: 'Rīga',
		tickets: ticketUrl ? [{ seller: sellerName(ticketUrl), url: ticketUrl }] : undefined,
		image: item.image,
		imageWidth: item.imageWidth,
		imageHeight: item.imageHeight,
		categoryHint: item.category ? item.category.split(/\s+/).filter(Boolean) : undefined,
		status: /\batcelt[sa]?\b/i.test(title) ? 'cancelled' : undefined
	};
}
