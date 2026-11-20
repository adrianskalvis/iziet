import type { RawEvent } from '../../../src/lib/shared/types';
import { fold } from '../../../src/lib/shared/fold';
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

export const PALLADIUM_ID = 'palladium';
export const PALLADIUM_BASE = 'https://www.palladium.lv/';
export const PALLADIUM_CALENDAR = `${PALLADIUM_BASE}lv/kalendars/`;
export const PALLADIUM_TICKETS = `${PALLADIUM_BASE}lv/biletes/`;
const ADDRESS = 'Marijas iela 21, Rīga';

export interface PalladiumCard {
	title: string;
	day: number;
	month: number;
	/** Event page on palladium.lv (calendar) or the seller link (tickets page). */
	href?: string;
	image?: string;
	soldOut: boolean;
}

/** Cards on /lv/kalendars/ and /lv/biletes/. The two pages share one layout. */
export function parsePalladiumCards(html: string): PalladiumCard[] {
	const $ = cheerio.load(html);
	const cards: PalladiumCard[] = [];
	$('.containers4rinda').each((_, element) => {
		const card = $(element);
		const data = card.find('.insideEventData').first();
		const date = cleanText(data.find('.insideEventDataDate').text());
		const match = date.match(/^(\d{1,2})\s*\/\s*(\p{L}+)/u);
		const month = match ? monthNumber(match[2]) : undefined;
		const titleNode = data.clone();
		titleNode.find('.insideEventDataDate').remove();
		const title = cleanText(titleNode.text());
		if (!match || !month || !title) return;
		cards.push({
			title,
			day: Number(match[1]),
			month,
			href: absoluteUrl(card.find('a[href]').first().attr('href'), PALLADIUM_BASE),
			image: absoluteUrl(card.find('img').first().attr('src'), PALLADIUM_BASE),
			soldOut: card.find('img.cancelledSoldout').length > 0
		});
	});
	return cards;
}

export const cardKey = (card: Pick<PalladiumCard, 'title' | 'day' | 'month'>): string =>
	`${fold(card.title).replace(/[^a-z0-9]/g, '')}-${card.month}-${card.day}`;

function readStartTime(text: string): { hour: number; minute: number } | undefined {
	const start = text.match(/s[āa]kums[^\d]{0,25}(\d{1,2}[.:]\d{2})/i);
	if (start) return readTime(start[1]);
	const doors = text.match(/ieeja[^\d]{0,25}(\d{1,2}[.:]\d{2})/i);
	return doors ? readTime(doors[1]) : undefined;
}

function readAge(text: string): number | undefined {
	const match = text.match(/no\s+(\d{1,2})\s*(?:gadu|g\.)/i) ?? text.match(/\b(\d{1,2})\+/);
	return match ? Number(match[1]) : undefined;
}

/** Event page plus the card data from the two list pages. */
export function parsePalladiumDetail(
	html: string,
	calendarCard: PalladiumCard,
	ticketCard: PalladiumCard | undefined,
	pageUrl: string,
	now: Date,
	horizonDays: number
): RawEvent | undefined {
	const $ = cheerio.load(html);
	const infoText = cleanText($('.calendarInfoBlock').text());
	const time = readStartTime(infoText);
	const year = inferYear(calendarCard.month, calendarCard.day, now);
	const start = isoFrom(year, calendarCard.month, calendarCard.day, time);
	if (!notEnded(start, undefined, now) || !withinHorizon(start, now, horizonDays)) return undefined;

	const ticketUrl = ticketCard?.href && !ticketCard.href.startsWith(PALLADIUM_BASE) ? ticketCard.href : undefined;
	const paragraphs = $('.insideRightSide p')
		.map((_, p) => cleanText($(p).text()))
		.get()
		.filter(Boolean);
	const image = absoluteUrl($('meta[property="og:image"]').attr('content'), pageUrl) ?? calendarCard.image;
	const soldOut = calendarCard.soldOut || (ticketCard?.soldOut ?? false);
	return {
		source: PALLADIUM_ID,
		sourceId: new URL(pageUrl).pathname.split('/').filter(Boolean).pop() ?? pageUrl,
		url: pageUrl,
		title: fixShoutingTitle(calendarCard.title),
		description: plainText(paragraphs.join(' ')),
		start,
		allDay: time ? undefined : true,
		venueName: 'Palladium Rīga',
		address: ADDRESS,
		town: 'Rīga',
		lat: 56.951,
		lng: 24.1256,
		tickets: ticketUrl ? [{ seller: sellerName(ticketUrl), url: ticketUrl }] : undefined,
		image,
		categoryHint: ['koncerts'],
		ageMin: readAge(infoText),
		status: soldOut ? 'soldout' : undefined,
		defaultCategory: 'koncerti'
	};
}
