import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import type { Http } from '../../lib/http';
import index from './index';
import { dayFromUrl, eventFromEntry, listEntries, parseKpanelEvent, parseRangeEnd, parseTimes, sourceIdOf } from './parse';
import { KPANEL_SITES } from './sites';

const fixture = (name: string) => readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
const NOW = new Date('2026-11-20T10:00:00Z');
const site = (id: string) => KPANEL_SITES.find((candidate) => candidate.id === id)!;

const JEK = 'https://visit.jekabpils.lv/lv/visi-pasakumi/';
const BAU = 'https://visit.bauska.lv/lv/pasakumi/';
const jekEvent = `${JEK}2026-11-21/1365-tinder-party-naktskluba-green-haven/`;
const jekRange = `${JEK}2026-11-18/1366-aktivitates-jekabpils-sporta-halles-ledus-arena/`;
const bauEvent = `${BAU}2026-11-21/3951-praktisku-seminaru-cikls-evertu-pirtszintis-4-dabas/`;
const bauRange = `${BAU}2026-11-09/patriotiska-gardezu-nedela-bauskas-novada/`;

describe('date helpers', () => {
	test('reads the day from the event path', () => {
		expect(dayFromUrl(jekEvent)).toEqual({ year: 2026, month: 11, day: 21 });
		expect(dayFromUrl(`${JEK}2026-11-21/`)).toBeUndefined();
		expect(sourceIdOf(jekEvent)).toBe('2026-11-21/1365-tinder-party-naktskluba-green-haven');
	});

	test('reads the last day of a range in both templates', () => {
		const start = { year: 2026, month: 11, day: 9 };
		expect(parseRangeEnd('9.–22. novembris, 2026', start)).toEqual({ year: 2026, month: 11, day: 22 });
		expect(parseRangeEnd('18 Nov - 23 Nov | 12:00', { year: 2026, month: 11, day: 18 })).toEqual({ year: 2026, month: 11, day: 23 });
		expect(parseRangeEnd('28 Okt - 8 Dec | 09:00', { year: 2026, month: 10, day: 28 })).toEqual({ year: 2026, month: 12, day: 8 });
		expect(parseRangeEnd('20 Nov - 15 Mar | 09:00', { year: 2026, month: 11, day: 20 })).toEqual({ year: 2027, month: 3, day: 15 });
		expect(parseRangeEnd('21 Nov | 16:00', { year: 2026, month: 11, day: 21 })).toBeUndefined();
	});

	test('reads start and end time', () => {
		expect(parseTimes('10:00 - 18:00')).toEqual({ start: [10, 0], end: [18, 0] });
		expect(parseTimes('22:00')).toEqual({ start: [22, 0], end: undefined });
		expect(parseTimes(undefined)).toEqual({ start: undefined, end: undefined });
	});
});

describe('jekabpils', () => {
	test('lists event links with date, time, category and image', () => {
		const entries = listEntries(fixture('jekabpils-list.html'), JEK);
		expect(entries.length).toBeGreaterThan(8);
		const timed = entries.find((entry) => entry.time && entry.category)!;
		expect(timed.title).toBeTruthy();
		expect(timed.time).toMatch(/^\d{2}:\d{2}$/);
		expect(timed.image).toContain('/large_');
		expect(entries.some((entry) => entry.endDate)).toBe(true);
		expect(entries.every((entry) => /\d{4}-\d{2}-\d{2}/.test(entry.url))).toBe(true);
	});

	test('reads the event page: time, venue, address, town, description, large image', () => {
		const config = site('jekabpils');
		const event = parseKpanelEvent(fixture('jekabpils-event.html'), jekEvent, config)!;
		expect(event).toMatchObject({
			sourceId: '2026-11-21/1365-tinder-party-naktskluba-green-haven',
			start: '2026-11-21T22:00:00+02:00',
			venueName: 'Naktsklubs "Green Haven"',
			address: 'Mežrūpnieku iela 2, Jēkabpils',
			town: 'Jēkabpils',
			categoryHint: ['Citi pasākumi'],
			lang: ['lv']
		});
		expect(event.description).toContain('DJ Aleksander Lustix');
		expect(event.image).toContain('/large_');
		expect(JSON.stringify(event)).not.toMatch(/@|\b2\d{7}\b/);
	});

	test('a multi-day event gets an end on the last day', () => {
		const event = parseKpanelEvent(fixture('jekabpils-range-event.html'), jekRange, site('jekabpils'))!;
		expect(event.start).toBe('2026-11-18T12:00:00+02:00');
		expect(event.end).toBe('2026-11-23T23:59:00+02:00');
	});

	test('list data alone makes a usable event', () => {
		const entries = listEntries(fixture('jekabpils-list.html'), JEK);
		const entry = entries.find((candidate) => candidate.time && candidate.title)!;
		const event = eventFromEntry(entry, site('jekabpils'))!;
		expect(event.start).toMatch(/T\d{2}:\d{2}:00\+0[23]:00$/);
		expect(event.town).toBe('Jēkabpils');
		expect(event.url).toBe(entry.url);
	});
});

describe('bauska', () => {
	test('lists the six cards', () => {
		const entries = listEntries(fixture('bauska-list.html'), BAU);
		expect(entries).toHaveLength(6);
		expect(entries.find((entry) => entry.url === bauRange)?.endDate).toEqual({ year: 2026, month: 11, day: 22 });
	});

	test('reads facts: date, time range, price and place', () => {
		const event = parseKpanelEvent(fixture('bauska-event.html'), bauEvent, site('bauska'))!;
		expect(event).toMatchObject({
			start: '2026-11-21T10:00:00+02:00',
			end: '2026-11-21T18:00:00+02:00',
			priceMin: 70,
			venueName: 'Sensēta "Everti"',
			town: 'Bauska'
		});
		expect(event.image).toContain('/uploads/plugins/events/large_');
	});

	test('a date range spans the days', () => {
		const event = parseKpanelEvent(fixture('bauska-range-event.html'), bauRange, site('bauska'))!;
		expect(event.start).toBe('2026-11-09T09:00:00+02:00');
		expect(event.end).toBe('2026-11-22T22:00:00+02:00');
	});
});

describe('adapter run', () => {
	function stub(pages: Record<string, string>): Http & { calls: string[] } {
		const calls: string[] = [];
		return {
			calls,
			async text(url) {
				calls.push(url);
				const body = pages[url];
				if (body === undefined) throw new Error(`404 ${url}`);
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

	test('bauska reads the list and its event pages, and falls back to list data on a failed page', async () => {
		const http = stub({ [BAU]: fixture('bauska-list.html'), [bauEvent]: fixture('bauska-event.html'), [bauRange]: fixture('bauska-range-event.html') });
		const adapter = index.find((candidate) => candidate.id === 'bauska')!;
		const events = await adapter.fetch({ http, now: NOW, horizonDays: 120, log: () => {} });
		expect(events.length).toBeGreaterThanOrEqual(3);
		expect(events.find((event) => event.url === bauEvent)?.priceMin).toBe(70);
		for (const event of events) {
			expect(event.start).toMatch(/\+0[23]:00$/);
			expect(event.town).toBe('Bauska');
		}
	});

	test('jekabpils skips events that ended before the grace period', async () => {
		const entries = listEntries(fixture('jekabpils-list.html'), JEK);
		const pages: Record<string, string> = { [JEK]: fixture('jekabpils-list.html') };
		for (const entry of entries) pages[entry.url] = fixture('jekabpils-event.html');
		const http = stub(pages);
		const adapter = index.find((candidate) => candidate.id === 'jekabpils')!;
		const events = await adapter.fetch({ http, now: NOW, horizonDays: 120, log: () => {} });
		expect(http.calls.length).toBeLessThanOrEqual(1 + entries.length);
		expect(events.length).toBeGreaterThan(0);
	});

	test('ids are jekabpils and bauska', () => {
		expect(index.map((adapter) => adapter.id)).toEqual(['jekabpils', 'bauska']);
	});
});
