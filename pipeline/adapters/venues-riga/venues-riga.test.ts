import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import venues, { monthsInHorizon } from './index';
import {
	cardKey,
	fixShoutingTitle,
	lnmmEvents,
	monthNumber,
	operaEvents,
	parseHanzasDetail,
	parseHanzasList,
	parseHeroDates,
	parseLnmmCalendar,
	parseMezaparksDetail,
	parseMezaparksHome,
	parseOperaMonth,
	parsePalladiumCards,
	parsePalladiumDetail,
	parseProduction,
	parseRepertoire,
	parseXiaomiDate,
	parseXiaomiDetail,
	parseXiaomiHome,
	splitTitle,
	upcomingHanzasItems
} from './parse';

const read = (name: string) => readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
const NOW = new Date('2026-11-20T08:00:00Z');
const OFFSET = /\+0[23]:00$/;

describe('adapter list', () => {
	test('exports the seven venue ids', () => {
		expect(venues.map((adapter) => adapter.id)).toEqual([
			'xiaomi-arena',
			'palladium',
			'hanzas-perons',
			'mezaparks',
			'opera',
			'nacionalais-teatris',
			'lnmm'
		]);
	});

	test('covers the months up to the horizon', () => {
		expect(monthsInHorizon(NOW, 100)).toEqual([[2026, 11], [2026, 12], [2027, 1], [2027, 2]]);
	});
});

describe('xiaomi-arena', () => {
	const items = parseXiaomiHome(read('xiaomi-home.html'));

	test('reads slider items with ticket link and image size', () => {
		expect(items.length).toBeGreaterThan(3);
		const nickelback = items.find((item) => item.url.includes('nickelback'))!;
		expect(nickelback.ticketUrl).toContain('bilesuserviss.lv');
		expect(nickelback.imageWidth).toBe(1140);
		expect(nickelback.imageHeight).toBe(640);
		expect(nickelback.category).toBe('Mūzika');
	});

	test('detail gives start and description', () => {
		const item = items.find((entry) => entry.url.includes('nickelback'))!;
		const event = parseXiaomiDetail(read('xiaomi-detail.html'), item, NOW, 400)!;
		expect(event.start).toBe('2027-07-04T18:30:00+03:00');
		expect(event.venueName).toBe('Xiaomi Arēna');
		expect(event.tickets?.[0].seller).toBe('Biļešu Serviss');
		expect((event.description ?? '').length).toBeLessThanOrEqual(600);
		expect(JSON.stringify(event)).not.toContain('@');
	});

	test('reads Latvian dates', () => {
		expect(parseXiaomiDate('Svētdiena, 4. jūlijs, 2027', NOW)).toEqual({ day: 4, month: 7, year: 2027 });
	});

	test('drops events beyond the horizon', () => {
		const item = items.find((entry) => entry.url.includes('nickelback'))!;
		expect(parseXiaomiDetail(read('xiaomi-detail.html'), item, NOW, 30)).toBeUndefined();
	});
});

describe('palladium', () => {
	const calendar = parsePalladiumCards(read('palladium-calendar.html'));
	const tickets = new Map(parsePalladiumCards(read('palladium-tickets.html')).map((card) => [cardKey(card), card]));

	test('reads cards from both pages', () => {
		expect(calendar.length).toBe(8);
		expect(calendar[0].href).toContain('/lv/kalendars/');
		expect(calendar[0].soldOut).toBe(true);
	});

	test('joins the seller link by title and date', () => {
		const card = calendar[1];
		expect(tickets.get(cardKey(card))?.href).toContain('bilesuserviss.lv');
	});

	test('detail gives doors time, age and sold out', () => {
		const card = calendar[0];
		const event = parsePalladiumDetail(read('palladium-detail.html'), card, tickets.get(cardKey(card)), card.href!, NOW, 120)!;
		expect(event.start).toBe('2026-11-20T20:00:00+02:00');
		expect(event.ageMin).toBe(18);
		expect(event.status).toBe('soldout');
		expect(event.lat).toBeCloseTo(56.951, 2);
		expect(event.title).toBe('Fatboy slim - crave night');
		expect(JSON.stringify(event)).not.toContain('info@');
	});
});

describe('hanzas-perons', () => {
	const items = parseHanzasList(read('hanzas-list.html'));

	test('de-duplicates the desktop and mobile copies', () => {
		const keys = items.map((item) => `${item.url}${item.year}${item.month}${item.day}`);
		expect(new Set(keys).size).toBe(items.length);
	});

	test('keeps upcoming items only', () => {
		const upcoming = upcomingHanzasItems(items, NOW, 400);
		expect(upcoming.length).toBeGreaterThan(0);
		expect(upcoming.every((item) => Date.UTC(item.year, item.month - 1, item.day) >= Date.UTC(2026, 10, 19))).toBe(true);
	});

	test('detail gives ticket link, price and image', () => {
		const item = items.find((entry) => entry.url.includes('otayonii'))!;
		const event = parseHanzasDetail(read('hanzas-detail.html'), item);
		expect(event.start).toBe('2026-12-13T16:00:00+02:00');
		expect(event.priceMin).toBe(30);
		expect(event.tickets?.[0]).toEqual({ seller: 'Biļešu Paradīze', url: 'https://www.bilesuparadize.lv/lv/event/175801' });
		expect(event.image).toContain('hanzasperons.lv/wp-content/uploads');
		expect(event.categoryHint).not.toContain('jaunakie-lv');
	});
});

describe('mezaparks', () => {
	test('reads event links from the home page', () => {
		const urls = parseMezaparksHome(read('mezaparks-home.html'));
		expect(urls).toContain('https://estrade.riga.lv/pasakumi/celabiedri-hospitalu-iela/');
	});

	test('reads hero dates', () => {
		expect(parseHeroDates('S. 07.11.2026. 19:00')).toEqual({ start: '2026-11-07T19:00:00+02:00', end: undefined, allDay: false });
		expect(parseHeroDates('T. 26.08.2026. 8:00 - Sv. 18.10.2026. 20:00')?.end).toBe('2026-10-18T20:00:00+03:00');
	});

	test('detail gives ticket link, and past events drop out', () => {
		const url = 'https://estrade.riga.lv/pasakumi/celabiedri-hospitalu-iela/';
		const early = new Date('2026-11-01T08:00:00Z');
		const event = parseMezaparksDetail(read('mezaparks-detail.html'), url, early, 120)!;
		expect(event.start).toBe('2026-11-07T19:00:00+02:00');
		expect(event.tickets?.[0].url).toBe('https://www.bilesuparadize.lv/lv/event/179199');
		expect(event.venueName).toContain('Kokaru zāle');
		expect(parseMezaparksDetail(read('mezaparks-detail.html'), url, NOW, 120)).toBeUndefined();
	});
});

describe('opera', () => {
	const entries = parseOperaMonth(read('opera-2026-11.html'), 2026, 11);

	test('reads performances with time, ticket link and sold out', () => {
		expect(entries.length).toBe(11);
		const withTicket = entries.find((entry) => entry.show.ticketUrl)!;
		expect(withTicket.show.ticketUrl).toContain('biletes.opera.lv');
		expect(entries.some((entry) => entry.show.soldOut)).toBe(true);
	});

	test('groups per production and drops ended shows', () => {
		const events = operaEvents(entries, NOW, 120);
		expect(events.length).toBeGreaterThan(0);
		for (const event of events) {
			expect(event.start).toMatch(OFFSET);
			expect(Date.parse(event.start)).toBeGreaterThanOrEqual(NOW.getTime() - 3 * 3600_000);
			expect(event.defaultCategory).toMatch(/teatris|koncerti/);
			expect(event.address).toBe('Aspazijas bulvāris 3, Rīga');
		}
	});
});

describe('nacionalais-teatris', () => {
	test('reads production links', () => {
		const urls = parseRepertoire(read('teatris-repertoire.html'));
		expect(urls.length).toBe(6);
		expect(urls[0]).toMatch(/^https:\/\/teatris\.lv\/izrade\//);
	});

	test('production page gives dates, tickets, age and hall', () => {
		const event = parseProduction(read('teatris-production.html'), 'https://teatris.lv/izrade/dons-zuans/', NOW, 120)!;
		expect(event.title).toBe('Dons Žuans');
		expect(event.start).toBe('2026-11-26T19:00:00+02:00');
		expect(event.occurrences).toContain('2026-12-12T18:00:00+02:00');
		expect(event.tickets?.[0].url).toBe('https://www.bilesuparadize.lv/lv/event/178066');
		expect(event.ageMin).toBe(16);
		expect(event.venueName).toContain('Lielā zāle');
		expect(event.end).toMatch(OFFSET);
	});
});

describe('lnmm', () => {
	const items = parseLnmmCalendar(read('lnmm-calendar.html'));

	test('reads exhibitions and events and splits the title', () => {
		expect(items.length).toBeGreaterThan(4);
		expect(items.some((item) => item.kind === 'Izstāde')).toBe(true);
		expect(splitTitle('Lekcija:<br/><strong>Bārkstis</strong>')).toEqual({ kind: 'Lekcija', title: 'Bārkstis' });
	});

	test('exhibitions are all day with an end date, events carry a time', () => {
		const events = lnmmEvents(items, NOW, 400);
		const exhibition = events.find((event) => event.end)!;
		expect(exhibition.allDay).toBe(true);
		expect(exhibition.defaultCategory).toBe('izstades');
		const timed = events.find((event) => !event.allDay)!;
		expect(timed.start).toMatch(OFFSET);
		expect(events.every((event) => Date.parse(event.end ?? event.start) >= NOW.getTime())).toBe(true);
	});
});

describe('helpers', () => {
	test('month names and abbreviations', () => {
		expect(monthNumber('Mai')).toBe(5);
		expect(monthNumber('decembris')).toBe(12);
		expect(monthNumber('jūn.')).toBe(6);
	});

	test('shouting titles', () => {
		expect(fixShoutingTitle('AMINATA - LIELA MEITENE')).toBe('Aminata - liela meitene');
		expect(fixShoutingTitle('Dons Žuans')).toBe('Dons Žuans');
	});
});
