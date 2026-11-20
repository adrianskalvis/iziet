import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import type { Http } from '../../lib/http';
import index from './index';
import { mapTecEvent, parseTecResponse, pickImage, splitDigest, type TecResponse } from './parse';
import { TEC_SITES } from './sites';

const load = (name: string) => JSON.parse(readFileSync(path.join(__dirname, 'fixtures', name), 'utf8')) as TecResponse;
const NOW = new Date('2026-11-20T10:00:00Z');
const site = (id: string) => TEC_SITES.find((candidate) => candidate.id === id)!;

describe('dzintari', () => {
	const response = load('dzintari.json');
	const config = site('dzintari');

	test('maps a concert with hall, ticket link, language and end time', () => {
		const event = mapTecEvent(response.events[0], config)!;
		expect(event).toMatchObject({
			sourceId: '18373',
			title: 'Kors Henrijs “Mūzika no sirds”',
			start: '2026-11-23T20:00:00+02:00',
			end: '2026-11-23T23:00:00+02:00',
			venueName: 'Dzintaru koncertzāle, Mazā zāle',
			address: 'Turaidas iela 1, Jūrmala',
			town: 'Jūrmala',
			lang: ['lv']
		});
		expect(event.tickets).toEqual([{ seller: 'Biļešu Paradīze', url: 'https://www.bilesuparadize.lv/lv/event/178372' }]);
		expect(event.image).toMatch(/^https:\/\/dzintarukoncertzale\.lv\/wp-content\/uploads\//);
	});

	test('removes the English copy when the Latvian copy has the same start and ticket', () => {
		const all = response.events.map((event) => mapTecEvent(event, config)!);
		const kept = parseTecResponse(response, config);
		expect(all.some((event) => event.lang?.includes('en'))).toBe(true);
		expect(kept.length).toBeLessThan(all.length);
		const keys = kept.map((event) => `${event.start}|${event.tickets?.[0]?.url.match(/\/event\/(\d+)/)?.[1]}`);
		expect(new Set(keys).size).toBe(keys.length);
	});

	test('picks an image between 600 and 1200 px when one exists', () => {
		expect(
			pickImage({
				url: 'https://x.lv/big.jpg',
				width: 2400,
				sizes: { a: { url: 'https://x.lv/300.jpg', width: 300 }, b: { url: 'https://x.lv/800.jpg', width: 800 }, c: { url: 'https://x.lv/1000.jpg', width: 1000 } }
			})
		).toBe('https://x.lv/1000.jpg');
		expect(pickImage({ url: 'https://x.lv/small.jpg', width: 400 })).toBe('https://x.lv/small.jpg');
		expect(pickImage(false)).toBeUndefined();
	});
});

describe('aluksne digest', () => {
	const response = load('aluksne.json');
	const config = site('aluksne');

	test('splits a day entry into one event per paragraph with time and venue', () => {
		const sports = response.events.find((event) => event.title === 'Sports')!;
		const events = splitDigest(sports, config);
		expect(events.length).toBeGreaterThan(0);
		expect(events[0]).toMatchObject({
			start: '2026-11-20T20:00:00+02:00',
			venueName: 'Alūksnes Sporta centrā',
			town: 'Alūksne',
			categoryHint: ['Sports']
		});
		expect(events[0].title).toContain('basketbola');
	});

	test('keeps ordinal numbers inside the title and removes phone numbers', () => {
		const events = parseTecResponse(response, config);
		const school = events.find((event) => event.title.includes('Pūčulēnu skolas'))!;
		expect(school.title).toContain('2. nodarbība');
		expect(JSON.stringify(events)).not.toMatch(/\b2\d{7}\b/);
	});

	test('reads the entry price from the text', () => {
		const events = parseTecResponse(response, config);
		expect(events.some((event) => event.priceMin === 3)).toBe(true);
	});
});

describe('adapters', () => {
	function stub(pages: Record<string, unknown>): Http & { calls: string[] } {
		const calls: string[] = [];
		return {
			calls,
			async text(url) {
				calls.push(url);
				const page = pages[url];
				if (!page) throw new Error(`unexpected ${url}`);
				return JSON.stringify(page);
			},
			async json() {
				throw new Error('not used');
			},
			async isAllowed() {
				return true;
			}
		};
	}

	test('dzintari follows next_rest_url and sets the town', async () => {
		const response = load('dzintari.json');
		const first = { events: response.events.slice(0, 5), next_rest_url: 'https://dzintarukoncertzale.lv/wp-json/tribe/events/v1/events/?page=2' };
		const second = { events: response.events.slice(5) };
		const http = stub({
			'https://dzintarukoncertzale.lv/wp-json/tribe/events/v1/events?per_page=50&start_date=2026-11-20&end_date=2027-03-20': first,
			'https://dzintarukoncertzale.lv/wp-json/tribe/events/v1/events/?page=2': second
		});
		const adapter = index.find((candidate) => candidate.id === 'dzintari')!;
		const events = await adapter.fetch({ http, now: NOW, horizonDays: 120, log: () => {} });
		expect(http.calls).toHaveLength(2);
		expect(events.length).toBeGreaterThan(3);
		for (const event of events) {
			expect(event.town).toBe('Jūrmala');
			expect(event.defaultCategory).toBe('koncerti');
			expect(event.start).toMatch(/\+0[23]:00$/);
		}
	});

	test('aluksne returns events in the window', async () => {
		const http = stub({
			'https://aluksne.lv/index.php/wp-json/tribe/events/v1/events?per_page=50&start_date=2026-11-20&end_date=2027-03-20': load('aluksne.json')
		});
		const adapter = index.find((candidate) => candidate.id === 'aluksne')!;
		const events = await adapter.fetch({ http, now: NOW, horizonDays: 120, log: () => {} });
		expect(events.length).toBeGreaterThan(20);
		expect(new Set(events.map((event) => event.sourceId)).size).toBe(events.length);
	});

	test('ids are dzintari and aluksne; Rēzekne stays out', () => {
		expect(index.map((adapter) => adapter.id)).toEqual(['dzintari', 'aluksne']);
	});
});
