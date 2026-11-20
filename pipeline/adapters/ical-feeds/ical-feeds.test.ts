import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import type { Http } from '../../lib/http';
import index from './index';
import { fixCategoryFolds, parseIcalFeed, parseLocation, readAttachments } from './parse';
import { ICAL_SITES } from './sites';

const fixture = (name: string) => readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
const NOW = new Date('2026-11-20T10:00:00Z');
const site = (id: string) => ICAL_SITES.find((candidate) => candidate.id === id)!;

describe('location', () => {
	test('splits venue, address and town', () => {
		expect(parseLocation('Pabažu kultūras nams, Pabaži, Sējas pagasts, Saulkrastu novads, LV-2162, Latvia', 'Saulkrasti', true)).toEqual({
			venueName: 'Pabažu kultūras nams',
			address: 'Pabaži, Sējas pagasts, Saulkrastu novads',
			town: 'Pabaži'
		});
		expect(parseLocation('Saulkrastu kapi, Raiņa iela 2a, Saulkrasti, Saulkrastu novads, Latvia', 'Saulkrasti', true).town).toBe('Saulkrasti');
		expect(parseLocation('Zāle, Raiņa iela 7', 'Saulkrasti', true).town).toBe('Saulkrasti');
		expect(parseLocation(undefined, 'Daugavpils', false)).toEqual({ town: 'Daugavpils' });
	});
});

describe('feed helpers', () => {
	test('restores the space lost in folded CATEGORIES lines', () => {
		const text = 'CATEGORIES:Svētki un\r\n festivāli,Kultūra\r\nEND:VEVENT';
		expect(fixCategoryFolds(text)).toContain('Svētki un\n  festivāli');
	});

	test('reads ATTACH images by UID', () => {
		const images = readAttachments(fixture('saulkrasti.ics'));
		expect(images.get('3444@saulkrasti.lv')).toBe('https://saulkrasti.lv/wp-content/uploads/2026/10/Tresais_celiens.png');
	});
});

describe('saulkrasti feed', () => {
	const events = parseIcalFeed(fixture('saulkrasti.ics'), site('saulkrasti'));

	test('maps UTC times to Riga offsets', () => {
		expect(events).toHaveLength(28);
		const concert = events.find((event) => event.sourceId === '3444@saulkrasti.lv')!;
		expect(concert.start).toBe('2026-11-21T18:00:00+02:00');
		expect(concert.end).toBe('2026-11-21T19:30:00+02:00');
		expect(concert.venueName).toBe('Sējas kultūras nams');
		expect(concert.image).toContain('Tresais_celiens.png');
		expect(concert.categoryHint).toEqual(['Kultūra']);
	});

	test('reads free entry and carries no phone numbers', () => {
		const concert = events.find((event) => event.sourceId === '3444@saulkrasti.lv')!;
		expect(concert.free).toBe(true);
		expect(JSON.stringify(events)).not.toMatch(/\b2\d{7}\b/);
	});
});

describe('visitdaugavpils feed', () => {
	const events = parseIcalFeed(fixture('visitdaugavpils.ics'), site('daugavpils-ical'));

	test('reads all-day and timed events', () => {
		expect(events.length).toBeGreaterThan(5);
		expect(events.some((event) => event.allDay)).toBe(true);
		expect(events.some((event) => !event.allDay && /T\d\d:\d\d:00\+0[23]:00$/.test(event.start))).toBe(true);
		for (const event of events) expect(event.town).toBe('Daugavpils');
	});

	test('marks Cyrillic titles as Russian', () => {
		const russian = events.filter((event) => /[\u0400-\u04ff]/.test(event.title));
		expect(russian.length).toBeGreaterThan(0);
		for (const event of russian) expect(event.lang).toEqual(['ru']);
	});

	test('all-day end is the last day, not the exclusive next day', () => {
		const banner = events.find((event) => event.allDay && event.end);
		if (banner) expect(banner.end).toMatch(/T23:59:00/);
	});
});

describe('adapters', () => {
	function stub(url: string, body: string): Http & { calls: string[] } {
		const calls: string[] = [];
		return {
			calls,
			async text(requested) {
				calls.push(requested);
				if (requested !== url) throw new Error(`unexpected ${requested}`);
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

	test('saulkrasti returns window events with unique ids and one request', async () => {
		const adapter = index.find((candidate) => candidate.id === 'saulkrasti')!;
		const http = stub('https://saulkrasti.lv/events.ics', fixture('saulkrasti.ics'));
		const events = await adapter.fetch({ http, now: NOW, horizonDays: 120, log: () => {} });
		expect(http.calls).toHaveLength(1);
		expect(events.length).toBeGreaterThan(10);
		expect(new Set(events.map((event) => event.sourceId)).size).toBe(events.length);
		for (const event of events) expect(event.start).toMatch(/\+0[23]:00$/);
	});

	test('daugavpils-ical drops banners longer than 90 days', async () => {
		const adapter = index.find((candidate) => candidate.id === 'daugavpils-ical')!;
		const http = stub('https://www.visitdaugavpils.lv/events.ics', fixture('visitdaugavpils.ics'));
		const events = await adapter.fetch({ http, now: NOW, horizonDays: 120, log: () => {} });
		for (const event of events) {
			if (event.end) expect(Date.parse(event.end) - Date.parse(event.start)).toBeLessThanOrEqual(90 * 86_400_000);
		}
	});

	test('ids are unique and rezekne is absent', () => {
		const ids = index.map((adapter) => adapter.id);
		expect(ids).toEqual(['daugavpils-ical', 'saulkrasti']);
	});
});
