import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { cheerio } from '../../lib/html';
import { type Http, RobotsDisallowedError } from '../../lib/http';
import { cleanDescription, finishEvent, inWindow, scrubPersonal, sentenceCase, statusFromTitle } from './common';
import index from './index';
import { eventsFromHtml, listingTargets, readJsonLd, repairJson } from './parse';
import { JSONLD_SITES, parseLiepajaListing } from './sites';
import { runJsonLdSite } from './site-adapter';

const fixture = (name: string) => readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
const NOW = new Date('2026-11-20T10:00:00Z');
const site = (id: string) => JSONLD_SITES.find((candidate) => candidate.id === id)!;

describe('common helpers', () => {
	test('converts only fully uppercase titles to sentence case', () => {
		expect(sentenceCase('RUNCIS ZĀBAKOS')).toBe('Runcis zābakos');
		expect(sentenceCase('LNSO, KONCERTS. ĀRĒJAIS', ['LNSO'])).toBe('LNSO, koncerts. Ārējais');
		expect(sentenceCase('Runcis zābakos')).toBe('Runcis zābakos');
		expect(sentenceCase('Džeza trio LE PETITE PARIS')).toBe('Džeza trio LE PETITE PARIS');
		expect(sentenceCase('2026')).toBe('2026');
	});

	test('removes e-mail addresses and phone numbers', () => {
		const text = scrubPersonal('Pieteikšanās: tālr. 26594529, +371 27891860 vai info@example.lv. Biļete 12 EUR.');
		expect(text).not.toMatch(/\d{8}|@/);
		expect(text).toContain('12 EUR');
	});

	test('cuts descriptions at 600 characters', () => {
		const long = `<p>${'Vārds '.repeat(300)}</p>`;
		expect(cleanDescription(long)!.length).toBeLessThanOrEqual(600);
	});

	test('reads status words from titles', () => {
		expect(statusFromTitle('Koncerts ATCELTS')).toBe('cancelled');
		expect(statusFromTitle('Izpārdots! Koncerts')).toBe('soldout');
		expect(statusFromTitle('Koncerts')).toBeUndefined();
	});

	test('keeps current events and drops ended, far and banner events', () => {
		const window = { now: NOW, horizonDays: 120 };
		expect(inWindow({ start: '2026-11-20T19:00:00+02:00' }, window)).toBe(true);
		expect(inWindow({ start: '2026-11-20T00:00:00+02:00', allDay: true }, window)).toBe(true);
		expect(inWindow({ start: '2026-11-19T10:00:00+02:00' }, window)).toBe(false);
		expect(inWindow({ start: '2026-11-19T10:00:00+02:00', end: '2026-11-25T10:00:00+02:00' }, window)).toBe(true);
		expect(inWindow({ start: '2027-06-01T10:00:00+03:00' }, window)).toBe(false);
		expect(inWindow({ start: '2026-01-01T00:00:00+02:00', end: '2026-12-31T23:00:00+02:00' }, window)).toBe(false);
	});

	test('finishEvent drops an end before the start and turns coordinate addresses into lat and lng', () => {
		const event = finishEvent(
			{
				source: 'x',
				sourceId: '1',
				url: 'https://example.lv/1',
				title: 'TEST NOTIKUMS',
				start: '2026-11-20T18:00:00+02:00',
				end: '2026-11-20T00:00:00+02:00',
				address: '56.566531, 21.019778',
				priceMin: 0,
				free: true
			},
			{ town: 'Liepāja' }
		)!;
		expect(event.title).toBe('Test notikums');
		expect(event.end).toBeUndefined();
		expect(event.address).toBeUndefined();
		expect(event.lat).toBeCloseTo(56.5665);
		expect(event.priceMin).toBeUndefined();
		expect(event.town).toBe('Liepāja');
	});
});

describe('JSON-LD reading', () => {
	test('repairs missing commas and trailing commas', () => {
		const broken = '{"a": {"b": 1}\n "url": "x", "c": [1,2,],}';
		expect(JSON.parse(repairJson(broken))).toEqual({ a: { b: 1 }, url: 'x', c: [1, 2] });
	});

	test('reads the broken Liepāja block', () => {
		const events = eventsFromHtml(fixture('liepaja-event.html'), 'https://kalendars.liepaja.lv/lv/2026-11-21:50526:210658/', {
			...site('liepaja'),
			urlIsPage: true
		});
		expect(events).toHaveLength(1);
		expect(events[0]).toMatchObject({
			title: 'Sarkangalvīte  2+'.replace('  ', ' '),
			start: '2026-11-21T11:00:00+02:00',
			end: '2026-11-21T11:45:00+02:00',
			url: 'https://kalendars.liepaja.lv/lv/2026-11-21:50526:210658/'
		});
	});
});

describe('daugavpils', () => {
	const config = site('daugavpils');
	const listUrl = 'https://www.daugavpils.lv/afisa/';

	test('finds event pages in the ItemList and ignores menu links', () => {
		const targets = listingTargets(fixture('daugavpils-list.html'), listUrl, config, NOW);
		expect(targets.length).toBeGreaterThan(20);
		expect(targets.every((target) => target.url.startsWith('https://www.daugavpils.lv/afisa/'))).toBe(true);
		const hinted = targets.find((target) => target.url.endsWith('muzejs-berniem-radosa-lasisana-2011'));
		expect(hinted?.event?.title).toBe('Muzejs bērniem | Radošā lasīšana');
	});

	test('long-running banners fall outside the window', () => {
		const targets = listingTargets(fixture('daugavpils-list.html'), listUrl, config, NOW);
		const banner = targets.find((target) => target.event?.title === 'Ielu remonta darbi');
		expect(banner).toBeDefined();
		expect(inWindow({ start: banner!.event!.start!, end: banner!.event!.end }, { now: NOW, horizonDays: 120, maxSpanDays: config.maxSpanDays })).toBe(false);
	});

	test('reads time, venue, description and a larger image from the event page', () => {
		const url = 'https://www.daugavpils.lv/afisa/dzeza-trio-le-petite-paris-zem-parizes-debesim';
		const [event] = eventsFromHtml(fixture('daugavpils-event.html'), url, { ...config, urlIsPage: true });
		expect(event.start).toBe('2026-11-20T18:00:00+02:00');
		expect(event.end).toBe('2026-11-20T19:00:00+02:00');
		expect(event.venueName).toContain('Vienības nama');
		expect(event.url).toBe(url);
		expect(event.image).toMatch(/_med\.jpg$/);
		expect(event.description).toContain('Le Petite Paris');
	});
});

describe('liepaja', () => {
	test('reads the listing with date, place, price and ticket link', () => {
		const items = parseLiepajaListing(fixture('liepaja-list.html'), 'https://kalendars.liepaja.lv/lv/', NOW);
		expect(items.length).toBeGreaterThan(10);
		const puppet = items.find((item) => item.url.includes('2026-11-21:50526:210658'))!;
		expect(puppet.event).toMatchObject({
			title: 'Sarkangalvīte 2+',
			start: '2026-11-21T11:00:00+02:00',
			venueName: 'Liepājas Leļļu teātris',
			priceMin: 10
		});
		expect(puppet.event?.tickets?.[0].seller).toBe('Biļešu Paradīze');
		const free = items.find((item) => item.event?.title?.includes('Sadzirdi kultūru'))!;
		expect(free.event?.free).toBe(true);
	});

	test('follows the load-more link', () => {
		const html = fixture('liepaja-list.html');
		const next = site('liepaja').nextPage!(cheerio.load(html), 'https://kalendars.liepaja.lv/lv/');
		expect(next).toMatch(/^https:\/\/kalendars\.liepaja\.lv\/lv\/page:2,/);
	});

	test('groups occurrences of one event by event id', () => {
		const group = site('liepaja').detailGroup!;
		expect(group('https://kalendars.liepaja.lv/lv/2026-11-20:50399:210479/')).toBe(group('https://kalendars.liepaja.lv/lv/2026-11-21:50399:210480/'));
	});
});

describe('lnso', () => {
	test('reads MusicEvent JSON-LD with ticket link and keeps LNSO uppercase', () => {
		const url = 'https://www.lnso.lv/event-list/lnso-bramsa-pirmais-un-malera-piekta/';
		const [raw] = eventsFromHtml(fixture('lnso-event.html'), url, { ...site('lnso'), urlIsPage: true });
		const event = finishEvent(raw, { town: 'Rīga', townIsFallback: true, keepUpper: ['LNSO'], defaultCategory: 'koncerti' })!;
		expect(event.title).toBe('LNSO, brāmsa pirmais un mālera piektā');
		expect(event.start).toBe('2026-11-27T19:00:00+02:00');
		expect(event.venueName).toBe('Rīgas Kongresu nams');
		expect(event.tickets).toEqual([{ seller: 'Biļešu Paradīze', url: 'https://www.bilesuparadize.lv/lv/event/171176' }]);
		expect(event.defaultCategory).toBe('koncerti');
	});

	test('lists event pages and the next listing page', () => {
		const html = fixture('lnso-list.html');
		const targets = listingTargets(html, 'https://www.lnso.lv/event-list/', site('lnso'), NOW);
		expect(targets.length).toBeGreaterThan(8);
		expect(targets.some((target) => /feed|page/.test(target.url))).toBe(false);
		expect(site('lnso').nextPage!(cheerio.load(html), 'https://www.lnso.lv/event-list/')).toBe('https://www.lnso.lv/event-list/page/2/');
	});
});

describe('dailes', () => {
	const events = eventsFromHtml(fixture('dailes-calendar.html'), 'https://www.dailesteatris.lv/lv/kalendars', site('dailes'));

	test('reads every performance with show page, hall and price range', () => {
		expect(events.length).toBeGreaterThan(8);
		const first = events[0];
		expect(first.title).toBe('RUNCIS ZĀBAKOS');
		expect(first.url).toBe('https://www.dailesteatris.lv/lv/izrades/2025-2026/runcis-zabakos-1');
		expect(first.venueName).toBe('Dailes teātris, Lielā zāle');
		expect(first).toMatchObject({ priceMin: 12, priceMax: 40, start: '2026-11-20T18:00:00+02:00' });
		expect(first.tickets?.[0]).toEqual({ seller: 'Biļešu Paradīze', url: 'https://www.bilesuparadize.lv/lv/event/177809' });
	});

	test('marks sold-out performances and drops the date-only end', () => {
		const finished = events.map((event) => finishEvent(event, { town: 'Rīga' })!);
		expect(finished.some((event) => event.status === 'soldout')).toBe(true);
		expect(finished.every((event) => !event.end)).toBe(true);
		expect(finished[0].title).toBe('Runcis zābakos');
	});
});

describe('adapter run with a stubbed client', () => {
	function stubHttp(pages: Record<string, string>): Http & { calls: string[] } {
		const calls: string[] = [];
		return {
			calls,
			async text(url) {
				calls.push(url);
				const body = pages[url];
				if (body === undefined) throw new Error(`no fixture for ${url}`);
				return body;
			},
			async json() {
				throw new Error('not used');
			},
			async isAllowed() {
				return true;
			}
		};
	}

	test('dailes returns events inside the window with Riga offsets', async () => {
		const http = stubHttp({ 'https://www.dailesteatris.lv/lv/kalendars': fixture('dailes-calendar.html') });
		const dailes = index.find((adapter) => adapter.id === 'dailes')!;
		const events = await dailes.fetch({ http, now: NOW, horizonDays: 120, log: () => {} });
		expect(events.length).toBeGreaterThan(8);
		for (const event of events) {
			expect(event.start).toMatch(/\+0[23]:00$/);
			expect(event.town).toBe('Rīga');
			expect(event.defaultCategory).toBe('teatris');
			expect(event.sourceId).toBeTruthy();
		}
		expect(new Set(events.map((event) => event.sourceId)).size).toBe(events.length);
	});

	test('daugavpils follows detail pages up to the cap and skips banners', async () => {
		const detail = fixture('daugavpils-event.html');
		const list = fixture('daugavpils-list.html');
		const targets = listingTargets(list, 'https://www.daugavpils.lv/afisa/', site('daugavpils'), NOW);
		const pages: Record<string, string> = { 'https://www.daugavpils.lv/afisa/': list };
		for (const target of targets) pages[target.url] = detail;
		const http = stubHttp(pages);
		const daugavpils = index.find((adapter) => adapter.id === 'daugavpils')!;
		const events = await daugavpils.fetch({ http, now: NOW, horizonDays: 120, log: () => {} });
		expect(http.calls.length).toBeLessThanOrEqual(1 + 40);
		expect(events.length).toBeGreaterThan(5);
		expect(events.every((event) => event.town === 'Daugavpils')).toBe(true);
		expect(http.calls).not.toContain('https://www.daugavpils.lv/afisa/gada-pasakumu-kalendars-25');
	});

	test('a blocked robots.txt yields no events and a log line', async () => {
		const logs: string[] = [];
		const http: Http = {
			async text(url) {
				throw new RobotsDisallowedError(url);
			},
			async json() {
				throw new Error('not used');
			},
			async isAllowed() {
				return false;
			}
		};
		const events = await runJsonLdSite(site('dailes'), { http, now: NOW, horizonDays: 120, log: (message) => logs.push(message) });
		expect(events).toEqual([]);
		expect(logs.join(' ')).toContain('robots.txt');
	});

	test('every adapter has a unique id and an https homepage', () => {
		const ids = index.map((adapter) => adapter.id);
		expect(new Set(ids).size).toBe(ids.length);
		expect(ids).toEqual(expect.arrayContaining(['daugavpils', 'liepaja', 'lnso', 'dailes']));
		for (const adapter of index) expect(adapter.homepage).toMatch(/^https:\/\//);
	});
});

describe('readJsonLd', () => {
	test('flattens ItemList items and graphs', () => {
		const nodes = readJsonLd(
			JSON.stringify({ '@graph': [{ '@type': 'ItemList', itemListElement: [{ '@type': 'ListItem', item: { '@type': 'Event', name: 'A' } }] }] })
		);
		expect(nodes.some((node) => node['@type'] === 'Event' && node.name === 'A')).toBe(true);
	});
});
