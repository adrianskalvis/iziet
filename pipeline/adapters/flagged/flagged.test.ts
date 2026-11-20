import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import type { Http } from '../../lib/http';
import { isEnabled } from '../registry';
import type { AdapterContext } from '../types';
import adapters from './index';
import {
	bsCardEvent,
	parseBsCardTime,
	parseBsEventPage,
	parseBsListing,
	parseLtDate,
	parseLtPage,
	parseTicketshopEvent,
	parseTicketshopSitemap,
	pickLtImage
} from './parse';

const fixture = (name: string) => readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
const now = new Date('2026-11-20T10:00:00Z');
const ISO_RIGA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+0[23]:00$/;

function fakeHttp(routes: Record<string, string>, calls: string[] = []): Http {
	const body = (url: string) => {
		calls.push(url);
		const key = Object.keys(routes).find((k) => url.startsWith(k));
		if (!key) throw new Error(`unexpected request ${url}`);
		return routes[key];
	};
	return {
		isAllowed: async () => true,
		text: async (url) => body(url),
		json: async <T>(url: string) => JSON.parse(body(url)) as T
	};
}

const ctxFor = (http: Http, horizonDays = 120): AdapterContext => ({ http, now, horizonDays, log: () => {} });

describe('flags', () => {
	test('all three adapters stay off by default', () => {
		const byId = Object.fromEntries(adapters.map((a) => [a.id, a]));
		expect(byId.bilesuserviss).toMatchObject({ flag: 'SOURCE_BILESUSERVISS', flagReason: expect.stringContaining('5.1') });
		expect(byId['latvia-travel']).toMatchObject({ flag: 'SOURCE_LATVIATRAVEL', flagReason: expect.stringContaining('LIAA') });
		expect(byId.ticketshop).toMatchObject({ flag: 'SOURCE_TICKETSHOP', flagReason: expect.stringContaining('5.2') });
		for (const adapter of adapters) {
			expect(isEnabled(adapter, {})).toBe(false);
			expect(isEnabled(adapter, { [adapter.flag!]: '1' })).toBe(true);
		}
	});
});

describe('Biļešu Serviss', () => {
	test('reads card times', () => {
		expect(parseBsCardTime('Pk 20.11.2026 • 19:00')).toEqual({ start: '2026-11-20T19:00:00+02:00', end: undefined, allDay: false });
		expect(parseBsCardTime('T 18.11.2026 - Sv 22.11.2026')).toEqual({
			start: '2026-11-18T00:00:00+02:00',
			end: '2026-11-22T23:59:00+02:00',
			allDay: true
		});
	});

	test('reads listing cards and drops events abroad', () => {
		const cards = parseBsListing(fixture('bilesuserviss-visi-page1.html'));
		expect(cards).toHaveLength(34);
		expect(cards[0]).toMatchObject({ code: 'M7W7IPCZHW', title: 'Rudens Vernisāža', venue: 'Spilves Lidlauks / SeBo Art' });
		expect(cards.some((c) => /Tallinn/.test(c.venue ?? ''))).toBe(false);
		expect(bsCardEvent(cards[1]).tickets?.[0].seller).toBe('Biļešu Serviss');
	});

	test('reads the Event JSON-LD with coordinates and image', () => {
		const url = 'https://www.bilesuserviss.lv/biletes/WAHYBEP5O7/fatboy-slim-crave-night-palladium';
		const event = parseBsEventPage(fixture('bilesuserviss-event-fatboy-slim.html'), url)!;
		expect(event).toMatchObject({
			sourceId: 'WAHYBEP5O7',
			title: 'Fatboy Slim - Crave Night @ Palladium',
			start: '2026-11-20T21:00:00+02:00',
			end: '2026-11-21T02:30:00+02:00',
			venueName: 'Palladium Rīga',
			town: 'Rīga',
			lat: 56.950813,
			lng: 24.125512,
			tickets: [{ seller: 'Biļešu Serviss', url }]
		});
		expect(event.image).toMatch(/\/images\/c7de5b02/);
		expect(event.description!.length).toBeLessThanOrEqual(600);
	});

	test('fetches listing pages, then event pages, within the request cap', async () => {
		const calls: string[] = [];
		const http = fakeHttp(
			{
				'https://www.bilesuserviss.lv/biletes/visi?page=2': fixture('bilesuserviss-visi-page2.html'),
				'https://www.bilesuserviss.lv/biletes/visi': fixture('bilesuserviss-visi-page1.html'),
				'https://www.bilesuserviss.lv/biletes/': fixture('bilesuserviss-event-fatboy-slim.html')
			},
			calls
		);
		const adapter = adapters.find((a) => a.id === 'bilesuserviss')!;
		// A horizon of 2 days stops paging after the second page.
		const events = await adapter.fetch(ctxFor(http, 2));
		expect(calls.length).toBeLessThanOrEqual(200);
		expect(calls[0]).toBe('https://www.bilesuserviss.lv/biletes/visi');
		expect(events.length).toBeGreaterThan(10);
		for (const event of events) expect(event.start).toMatch(ISO_RIGA);
	});
});

describe('latvia.travel', () => {
	test('reads the date formats', () => {
		expect(parseLtDate('Se 26.09 - Sv 06.12.2026')).toMatchObject({ start: '2026-09-26T00:00:00+03:00', end: '2026-12-06T23:59:00+02:00', allDay: true });
		expect(parseLtDate('Se 21.11.2026, 18:00 - 23:59')).toMatchObject({ start: '2026-11-21T18:00:00+02:00', end: '2026-11-21T23:59:00+02:00' });
		expect(parseLtDate('Pk 11.12.2026, 12:00 - Sv 13.12.2026, 19:00')?.end).toBe('2026-12-13T19:00:00+02:00');
		expect(parseLtDate('Se 28.11.2026')).toEqual({ start: '2026-11-28T00:00:00+02:00', allDay: true });
		expect(parseLtDate('drīzumā')).toBeUndefined();
	});

	test('maps the JSON page', () => {
		const events = parseLtPage(JSON.parse(fixture('latvia-travel-events-lv.json')));
		expect(events).toHaveLength(20);
		expect(events[0]).toMatchObject({
			sourceId: '30245',
			title: 'Kaspars Podnieks. Izstāde "Divradzis"',
			town: 'Liepāja',
			free: true,
			categoryHint: ['Māksla']
		});
		expect(events[0].lat).toBeCloseTo(56.5116, 3);
		const paid = events.find((e) => e.title === 'Grandbrothers')!;
		expect(paid).toMatchObject({ priceMin: 39, priceMax: 89, town: 'Rīga', start: '2026-12-04T19:00:00+02:00' });
		for (const event of events) {
			expect(event.start).toMatch(ISO_RIGA);
			expect(event.url).toMatch(/^https:\/\/www\.latvia\.travel\/lv\/pasakums\//);
			expect(event.image).toMatch(/^https:\/\/www\.latvia\.travel\/sites\/default\/files\/styles\//);
		}
	});

	test('picks a 600 to 1200 px image', () => {
		const html =
			'<picture><source srcset="/a/2600.jpg 1x" type="image/jpeg" width="1920"/><source srcset="/a/650.jpg 1x" type="image/jpeg" width="650"/></picture>';
		expect(pickLtImage(html)).toBe('https://www.latvia.travel/a/650.jpg');
	});

	test('follows the pager', async () => {
		const page = fixture('latvia-travel-events-lv.json');
		const last = JSON.stringify({ ...JSON.parse(page), pager: { count: 20, pages: 2, current_page: 1, next_page: null } });
		const calls: string[] = [];
		const http = fakeHttp(
			{
				'https://www.latvia.travel/lv/jsonapi/events/42?page=0': JSON.stringify({ ...JSON.parse(page), pager: { count: 40, pages: 2, current_page: 0, next_page: 1 } }),
				'https://www.latvia.travel/lv/jsonapi/events/42?page=1': last
			},
			calls
		);
		const adapter = adapters.find((a) => a.id === 'latvia-travel')!;
		const events = await adapter.fetch(ctxFor(http, 400));
		expect(calls).toHaveLength(2);
		expect(events.length).toBeGreaterThan(5);
	});
});

describe('Ticketshop', () => {
	test('reads the sitemap and an event page', () => {
		const urls = parseTicketshopSitemap(fixture('ticketshop-sitemap-lv.xml'));
		expect(urls).toHaveLength(15);
		const event = parseTicketshopEvent(fixture('ticketshop-event-108000.html'), 'https://ticketshop.lv/lv/events/108000')!;
		expect(event).toMatchObject({
			sourceId: '108000',
			start: '2027-07-10T15:00:00+03:00',
			end: '2027-07-11T18:00:00+03:00',
			venueName: 'Spilve Airport',
			town: 'Rīga',
			priceMin: 13,
			priceMax: 115,
			image: 'https://cdn.ticketshop.lv/event/108000/b64img_6a868f32b6dd2/403x570.webp'
		});
		expect(event.lat).toBeCloseTo(56.9764, 3);
		expect(event.tickets).toEqual([{ seller: 'Ticketshop', url: 'https://ticketshop.lv/lv/events/108000/tickets?type=standticket' }]);
		expect(event.description!.length).toBeLessThanOrEqual(600);
	});

	test('fetches the sitemap, then each event page', async () => {
		const calls: string[] = [];
		const http = fakeHttp(
			{
				'https://ticketshop.lv/sitemap_lv.xml': fixture('ticketshop-sitemap-lv.xml'),
				'https://ticketshop.lv/lv/events/': fixture('ticketshop-event-108000.html')
			},
			calls
		);
		const adapter = adapters.find((a) => a.id === 'ticketshop')!;
		const events = await adapter.fetch(ctxFor(http, 400));
		expect(calls).toHaveLength(16);
		expect(events).toHaveLength(15);
	});
});
