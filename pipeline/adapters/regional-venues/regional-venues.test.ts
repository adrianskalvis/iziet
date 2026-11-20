import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import type { RawEvent } from '../../../src/lib/shared/types';
import type { Http } from '../../lib/http';
import type { AdapterContext } from '../types';
import { cleanTitle, inWindow, priceFromText, stripContacts, townFromAddress } from './common';
import { fetchCesis, fetchJelgava, monthsAhead } from './fetchers';
import adapters from './index';
import {
	dobeleEvent,
	latgaleEvent,
	parseCesisDate,
	parseCesisEvent,
	parseCesisSitemap,
	parseDobeleDates,
	parseDobeleDetail,
	parseDobeleList,
	parseGors,
	parseJelgava,
	parseLatgaleDetail,
	parseLatgaleList,
	parseLielaisDzintars,
	parseTalsi,
	parseTukumsDetail,
	parseTukumsList,
	parseValmierasTeatris,
	tukumsEvent
} from './parse';

const fixture = (name: string) => readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
const now = new Date('2026-11-20T10:00:00Z');
const ISO_RIGA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+0[23]:00$/;

function expectValid(events: RawEvent[], source: string) {
	expect(events.length).toBeGreaterThan(0);
	for (const event of events) {
		expect(event.source).toBe(source);
		expect(event.title.length).toBeGreaterThan(0);
		expect(event.start).toMatch(ISO_RIGA);
		if (event.end) expect(event.end).toMatch(ISO_RIGA);
		expect(event.url).toMatch(/^https?:\/\//);
		expect(event.description?.length ?? 0).toBeLessThanOrEqual(600);
	}
}

describe('common helpers', () => {
	test('sentence-cases an all-uppercase title only', () => {
		expect(cleanTitle('KASPARS PODNIEKS. IZSTĀDE “DIVRADZIS”')).toBe('Kaspars podnieks. Izstāde “divradzis”');
		expect(cleanTitle('LNSO, Brāmsa pirmais')).toBe('LNSO, Brāmsa pirmais');
		expect(cleanTitle('  Fatboy   Slim ')).toBe('Fatboy Slim');
	});

	test('drops events that ended more than 12 hours ago and events past the horizon', () => {
		const base = { source: 's', sourceId: '1', url: 'https://x.lv', title: 'T' };
		expect(inWindow({ ...base, start: '2026-11-19T09:00:00+02:00' }, now, 120)).toBe(false);
		expect(inWindow({ ...base, start: '2026-11-20T02:00:00+02:00' }, now, 120)).toBe(true);
		expect(inWindow({ ...base, start: '2026-10-01T00:00:00+03:00', end: '2026-12-01T23:59:00+02:00' }, now, 120)).toBe(true);
		expect(inWindow({ ...base, start: '2027-06-01T19:00:00+03:00' }, now, 120)).toBe(false);
	});

	test('removes phone numbers and e-mail addresses', () => {
		expect(stripContacts('Cena 35 EUR. Rezervācijām: 27331109')).toBe('Cena 35 EUR.');
		expect(stripContacts('Pieteikšanās: info@example.lv. Ieeja brīva.')).toBe('Ieeja brīva.');
	});

	test('reads towns and prices from free text', () => {
		expect(townFromAddress('Jūras iela 73, Engure, Engures pagasts, Tukuma novads')).toBe('Engure');
		expect(priceFromText('Pieaugušajiem 35 EUR, bērniem 17,5 EUR')).toEqual({ priceMin: 17.5, priceMax: 35 });
		expect(priceFromText('Ieeja bez maksas')).toEqual({ free: true });
	});

	test('lists the months of the horizon', () => {
		const ctx = { now, horizonDays: 120 } as AdapterContext;
		expect(monthsAhead(ctx)[0]).toEqual({ year: 2026, month: 11 });
		expect(monthsAhead(ctx).length).toBe(5);
	});
});

describe('Lielais dzintars', () => {
	const events = parseLielaisDzintars(fixture('lielais-dzintars-2026-11.html'), 2026, 11, 'https://lielaisdzintars.lv/lv/kalendars');
	test('reads the month page', () => {
		expectValid(events, 'lielais-dzintars');
		expect(events).toHaveLength(30);
		expect(events.every((e) => e.town === 'Liepāja' && e.lat && e.lng)).toBe(true);
	});
	test('maps exhibitions, prices, tickets and statuses', () => {
		const exhibition = events[0];
		expect(exhibition).toMatchObject({ start: '2026-09-25T00:00:00+03:00', end: '2026-12-06T23:59:00+02:00', allDay: true, free: true });
		const paid = events.find((e) => e.priceMin === 18)!;
		expect(paid.tickets?.[0]).toEqual({ seller: 'Biļešu Paradīze', url: 'https://www.bilesuparadize.lv/lv/event/176091' });
		expect(paid.start).toBe('2026-11-20T19:00:00+02:00');
		expect(events.some((e) => e.status === 'cancelled')).toBe(true);
		expect(events.some((e) => e.status === 'postponed')).toBe(true);
	});
});

describe('GORS', () => {
	const events = parseGors(fixture('gors-2026-11.html'), 2026, 11, 'https://biletes.latgalesgors.lv/lv/events/2026-11');
	test('reads the month page with sold-out status and ticket links', () => {
		expectValid(events, 'gors');
		expect(events[0]).toMatchObject({ start: '2026-11-20T17:30:00+02:00', status: 'soldout', town: 'Rēzekne' });
		expect(events[1].tickets?.[0].seller).toBe('Biļešu Paradīze');
		expect(events[1].start).toBe('2026-11-20T19:00:00+02:00');
	});
});

describe('Cēsis', () => {
	test('reads the sitemap, newest first, without old or non-event pages', () => {
		const entries = parseCesisSitemap(fixture('cesis-sitemap.xml'), 400, now);
		expect(entries[0].url).toContain('joep-beving');
		expect(entries.some((e) => e.url.includes('old-event-example'))).toBe(false);
		expect(entries.some((e) => e.url.includes('/kontakti'))).toBe(false);
	});
	test('reads dates with and without a year', () => {
		expect(parseCesisDate('23. janvāris, sestdiena - 18:00, 2027', now)).toEqual({ year: 2027, month: 1, day: 23, hour: 18, minute: 0 });
		expect(parseCesisDate('5. decembris, sestdiena - 17:00', now)?.year).toBe(2026);
		expect(parseCesisDate('13. novembris, piektdiena - 19:00', now)?.year).toBe(2026);
	});
	test('reads an event page', () => {
		const event = parseCesisEvent(fixture('cesis-event-joep-beving.html'), 'https://www.cesukoncertzale.lv/pasakumi/ambiente-skatuve-joep-beving', now)!;
		expect(event).toMatchObject({
			title: 'Ambiente skatuve | JOEP BEVING',
			start: '2027-01-23T18:00:00+02:00',
			town: 'Cēsis',
			tickets: [{ seller: 'Biļešu Paradīze', url: 'https://www.bilesuparadize.lv/lv/event/181865' }]
		});
		expect(event.description).toContain('Jūps Bīvings');
		expect(event.image).toContain('jp-majas-lapa');
	});
	test('fetches the sitemap and each event page through ctx.http', async () => {
		const calls: string[] = [];
		const http: Http = {
			isAllowed: async () => true,
			json: async <T>() => ({}) as T,
			text: async (url) => {
				calls.push(url);
				return url.endsWith('sitemap.xml') ? fixture('cesis-sitemap.xml') : fixture('cesis-event-joep-beving.html');
			}
		};
		const logs: string[] = [];
		const events = await fetchCesis({ http, now, horizonDays: 365, log: (m) => logs.push(m) });
		expect(calls[0]).toBe('https://www.cesukoncertzale.lv/sitemap.xml');
		expect(calls.length).toBeLessThanOrEqual(200);
		expect(events.length).toBeGreaterThan(0);
		expect(events.every((e) => e.start === '2027-01-23T18:00:00+02:00')).toBe(true);
	});
});

describe('Valmieras teātris', () => {
	const events = parseValmierasTeatris(fixture('valmieras-teatris-kalendars.html'), 'https://valmierasteatris.lv/kalendars/');
	test('reads the calendar page', () => {
		expectValid(events, 'valmieras-teatris');
		expect(events[0]).toMatchObject({
			title: 'Pazudušais dēls',
			start: '2026-11-20T18:30:00+02:00',
			end: '2026-11-20T22:00:00+02:00',
			priceMin: 32,
			town: 'Valmiera',
			defaultCategory: 'teatris'
		});
		expect(events[0].tickets?.[0].url).toBe('https://www.bilesuparadize.lv/lv/event/178348');
	});
});

describe('Dobele', () => {
	test('reads the date formats of the listing', () => {
		expect(parseDobeleDates('19.09.2026 - 01.12.2026')).toEqual({ start: '2026-09-19T00:00:00+03:00', end: '2026-12-01T23:59:00+02:00', allDay: true });
		expect(parseDobeleDates('20.11.2026 18:00 - 20:30')).toEqual({ start: '2026-11-20T18:00:00+02:00', end: '2026-11-20T20:30:00+02:00', allDay: false });
		expect(parseDobeleDates('25.10.2026 11:00 - 22.11.2026 - 14:00')?.end).toBe('2026-11-22T14:00:00+02:00');
		expect(parseDobeleDates('31.12.2026')).toEqual({ start: '2026-12-31T00:00:00+02:00', end: undefined, allDay: true });
	});
	test('reads the listing and one detail page', () => {
		const cards = parseDobeleList(fixture('dobele-pasakumi.html'), 'https://visitdobele.lv/pasakumi');
		expect(cards).toHaveLength(30);
		expect(cards[2]).toMatchObject({ id: '20434', venue: 'Auces pilsētas Kultūras nams' });
		const detail = parseDobeleDetail(fixture('dobele-event.html'));
		expect(detail).toMatchObject({ priceMin: 17.5, priceMax: 35 });
		expect(detail.description).toContain('Zoltners vēlās brokastis');
		expectValid(cards.map((card) => dobeleEvent(card, detail)), 'dobele');
	});
});

describe('Tukums', () => {
	test('reads the listing and the detail page', () => {
		const cards = parseTukumsList(fixture('tukums-pasakumi.html'), 'https://visittukums.lv/lv/Pasakumi');
		expect(cards).toHaveLength(10);
		expect(cards[0]).toMatchObject({ id: '6175', start: '2026-11-20T19:00:00+02:00', allDay: false });
		const detail = parseTukumsDetail(fixture('tukums-event.html'));
		expect(detail).toMatchObject({ priceMin: 25, town: 'Engure' });
		expect(detail.tickets?.[0].seller).toBe('Biļešu Paradīze');
		expect(JSON.stringify(detail)).not.toMatch(/\d{8}/);
		expectValid(cards.map((card) => tukumsEvent(card, card.id === '6175' ? detail : {})), 'tukums');
	});
});

describe('Talsi', () => {
	const events = parseTalsi(fixture('talsi-pasakumi.html'), 'https://visittalsi.com/pasakumi/', now);
	test('reads cards and infers the year', () => {
		expectValid(events, 'talsi');
		expect(events).toHaveLength(12);
		expect(events[0]).toMatchObject({ start: '2026-11-20T20:00:00+02:00', venueName: 'Kinoteātris “Auseklis”', town: 'Talsi', categoryHint: ['Kino'] });
		expect(events[events.length - 1].start.startsWith('2026-12-01')).toBe(true);
		expect(events.find((e) => e.allDay)).toBeDefined();
	});
});

describe('Latgale', () => {
	test('reads the month list and an event page', () => {
		const cards = parseLatgaleList(fixture('latgale-notikumi-2026-11.html'), 'https://latgale.travel/notikumi/');
		expect(cards.length).toBeGreaterThan(8);
		expect(cards[0]).toMatchObject({ title: 'Izstādes Preiļu pilī', venue: 'Preiļu pils', start: { year: 2026, month: 10, day: 1 }, end: { year: 2026, month: 12, day: 31 } });
		const detail = parseLatgaleDetail(fixture('latgale-event.html'));
		expect(detail).toMatchObject({ time: { hour: 15, minute: 0 }, place: '"Mieriņi", Susāju pagasts, Balvu novads' });
		const event = latgaleEvent(
			{ url: 'https://latgale.travel/notikumi/x/', title: 'X', start: { year: 2026, month: 11, day: 21 } },
			detail
		);
		expect(event).toMatchObject({ start: '2026-11-21T15:00:00+02:00', town: 'Mieriņi', priceMin: 20 });
		expect(event.description).not.toMatch(/\d{8}/);
	});
});

describe('Jelgava', () => {
	test('reads the listing with price, place and categories', () => {
		const events = parseJelgava(fixture('jelgava-pasakumi.html'), 'https://www.jelgava.lv/pasakumi/');
		expectValid(events, 'jelgava');
		expect(events[0]).toMatchObject({ start: '2026-11-20T18:00:00+02:00', priceMin: 15, town: 'Jelgava', venueName: 'Kultūras nams “Rota”' });
		const range = events.find((e) => e.end && e.end.slice(0, 10) !== e.start.slice(0, 10));
		expect(range).toBeDefined();
	});
	test('needs a single request', async () => {
		let calls = 0;
		const http: Http = {
			isAllowed: async () => true,
			json: async <T>() => ({}) as T,
			text: async () => {
				calls++;
				return fixture('jelgava-pasakumi.html');
			}
		};
		const events = await fetchJelgava({ http, now, horizonDays: 120, log: () => {} });
		expect(calls).toBe(1);
		expect(events.length).toBeGreaterThan(20);
	});
});

describe('adapter list', () => {
	test('has 9 unflagged adapters with the agreed ids', () => {
		expect(adapters.map((a) => a.id)).toEqual([
			'lielais-dzintars',
			'gors',
			'cesis-koncertzale',
			'valmieras-teatris',
			'dobele',
			'tukums',
			'talsi',
			'latgale',
			'jelgava'
		]);
		expect(adapters.some((a) => a.flag)).toBe(false);
	});
});
