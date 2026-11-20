import type { RawEvent } from '../../../src/lib/shared/types';
import { cheerio, cleanText } from '../../lib/html';
import { clock, inWindow, windowFor } from './util';

export const LEMADE_SOURCE = 'niche-lemade';
export const LEMADE_PAGE = 'https://www.lemade.lv/nodarbibas/pasakumu-kalendars/';
const VENUE = { name: 'LeMade School', address: 'Brīvības iela 169', town: 'Rīga', lat: 56.9673408, lng: 24.1475531 };
/** The widget shows 0.01 EUR for group bookings whose price is set per request. */
const PLACEHOLDER_PRICE = 0.01;

export interface LemadeSlot {
	date: string;
	start: string;
	end: string;
	title: string;
	price?: number;
	paymentNote?: string;
	state: 'open' | 'soldout' | 'cancelled';
}

export interface LemadeWeek {
	slots: LemadeSlot[];
	nextUrl?: string;
}

/** "16.11.2026" to "2026-11-16". */
function isoDate(text: string): string | undefined {
	const m = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
	return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : undefined;
}

/** Drops the Russian half of "Latvian text / Russian text" and "A ♡ B" titles. */
export function cleanLemadeTitle(raw: string): string {
	const first = cleanText(raw).split('♡')[0];
	return cleanText(first.replace(/\s*\/\s*[А-Яа-яЁё].*$/u, ''));
}

function stateOf(note: string): LemadeSlot['state'] {
	if (/atcelts/i.test(note)) return 'cancelled';
	if (/nav brīvu vietu/i.test(note)) return 'soldout';
	return 'open';
}

/** Reads one week of the booking calendar: the 7 columns carry the dates. */
export function parseLemadeWeek(html: string): LemadeWeek {
	const $ = cheerio.load(html);
	const dates = $('table.t-s-table thead th')
		.map((_, th) => isoDate($(th).find('.date').text()) ?? '')
		.get()
		.filter(Boolean);
	const slots: LemadeSlot[] = [];
	$('table.t-s-table tbody tr').each((_, row) => {
		$(row)
			.children('td')
			.each((index, cell) => {
				const date = dates[index - 1];
				if (!date) return;
				$(cell)
					.find('a.t-s-item')
					.each((__, item) => {
						const $item = $(item);
						const range = cleanText($item.find('.pd .time').text()).match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
						const title = cleanLemadeTitle($item.find('.pd .title').text());
						if (!range || !title) return;
						const priceMatch = cleanText($item.find('.popover-price').text()).match(/(\d+(?:[.,]\d+)?)\s*EUR/i);
						const price = priceMatch ? Number(priceMatch[1].replace(',', '.')) : undefined;
						slots.push({
							date,
							start: `${range[1].padStart(2, '0')}:${range[2]}`,
							end: `${range[3].padStart(2, '0')}:${range[4]}`,
							title,
							price,
							paymentNote: cleanText($item.find('.popover-price-helptext').text()) || undefined,
							state: stateOf($item.find('.notice-top').text())
						});
					});
			});
	});
	const next = $('a.calendar__next').attr('href');
	return { slots, nextUrl: next ? new URL(next, LEMADE_PAGE).toString() : undefined };
}

/** Private group bookings ("ar savējiem") have no public date, so they are not events. */
export function isPublicSlot(slot: LemadeSlot): boolean {
	if (/savējiem/i.test(slot.title)) return false;
	return slot.price === undefined || slot.price > PLACEHOLDER_PRICE;
}

export function lemadeSlotToRaw(slot: LemadeSlot, now: Date, horizonDays: number): RawEvent | undefined {
	if (!isPublicSlot(slot)) return undefined;
	const start = clock(slot.date, slot.start);
	const end = clock(slot.date, slot.end);
	if (!inWindow(windowFor(now, horizonDays), start, end)) return undefined;
	const priceText = slot.price !== undefined ? ` Cena ${slot.price.toFixed(2)} EUR${slot.paymentNote ? `, ${slot.paymentNote}` : ''}.` : '';
	const isCeramics = /keramik/i.test(slot.title);
	return {
		source: LEMADE_SOURCE,
		sourceId: `${slot.date}T${slot.start}:${slot.title}`,
		url: LEMADE_PAGE,
		title: slot.title,
		description: `Nodarbība LeMade School keramikas studijā Rīgā, Brīvības ielā 169. Vietu rezervē LeMade kalendārā.${priceText}`,
		start,
		end,
		venueName: VENUE.name,
		address: VENUE.address,
		town: VENUE.town,
		lat: VENUE.lat,
		lng: VENUE.lng,
		priceMin: slot.price,
		priceMax: slot.price,
		tickets: [{ seller: 'LeMade', url: LEMADE_PAGE }],
		tags: isCeramics ? ['keramika'] : undefined,
		lang: ['lv', 'ru'],
		ageMin: undefined,
		status: slot.state === 'cancelled' ? 'cancelled' : slot.state === 'soldout' ? 'soldout' : 'scheduled',
		defaultCategory: 'darbnicas'
	};
}
