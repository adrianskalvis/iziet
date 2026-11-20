import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, test } from 'vitest';
import type { Http } from '../../lib/http';
import type { AdapterContext } from '../types';
import { fetchMunicipality, resetPlatformState } from './fetch';
import adapters, { MUNICIPALITIES } from './index';
import { lastPageIndex, mergeDailyEntries, parseCalendar, parseDateRange, parseTimeRange } from './parse';

const fixture = (name: string) => readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
const riga = MUNICIPALITIES.find((m) => m.slug === 'riga')!;
const ropazi = MUNICIPALITIES.find((m) => m.slug === 'ropazi')!;

describe('date and time text', () => {
	test('reads a single day, a day span and a month span', () => {
		expect(parseDateRange('4. novembris, 2026')).toEqual({ start: { year: 2026, month: 11, day: 4 }, end: undefined });
		expect(parseDateRange('3.–17. novembris, 2026')).toEqual({
			start: { year: 2026, month: 11, day: 3 },
			end: { year: 2026, month: 11, day: 17 }
		});
		expect(parseDateRange('23. oktobris, 2026 – 14. novembris, 2026')?.start).toEqual({ year: 2026, month: 10, day: 23 });
		expect(parseDateRange('rīt')).toBeUndefined();
	});

	test('reads time ranges and all-day markers', () => {
		expect(parseTimeRange('10.00–18.00')).toMatchObject({ allDay: false, start: { hour: 10, minute: 0 }, end: { hour: 18, minute: 0 } });
		expect(parseTimeRange('Visu dienu').allDay).toBe(true);
	});
});

describe('calendar parsing', () => {
	const html = fixture('riga-20261104065136.html');
	const events = parseCalendar(html, riga, 'https://www.riga.lv/lv/notikumu-kalendars');

	test('reads every event on the page', () => {
		expect(events.length).toBeGreaterThanOrEqual(10);
		for (const event of events) {
			expect(event.start).toMatch(/T\d{2}:\d{2}:\d{2}\+0[23]:00$/);
			expect(event.source).toBe('muni-riga');
			expect(event.town).toBe('Rīga');
			expect(event.url).toMatch(/^https:\/\/www\.riga\.lv\/lv\/notikums\//);
		}
	});

	test('maps the first event', () => {
		expect(events[0]).toMatchObject({
			title: 'Izstāde “Sentimentālās vērtības. Brants un Vorkale”',
			start: '2026-11-04T10:00:00+02:00',
			end: '2026-11-04T18:00:00+02:00',
			venueName: 'Muzejs “Rīgas Jūgendstila centrs”',
			address: 'Alberta iela 12, LV-1010',
			categoryHint: ['Izstādes']
		});
	});

	test('keeps multi-day events with an end', () => {
		const span = events.find((e) => e.end && e.end.slice(0, 10) !== e.start.slice(0, 10));
		expect(span).toBeDefined();
	});

	test('reads the pager', () => {
		expect(lastPageIndex(html)).toBe(11);
	});

	test('reads a small municipality list', () => {
		const list = parseCalendar(fixture('ropazi-20261114000247.html'), ropazi, 'https://www.ropazi.lv/lv/notikumu-kalendars');
		expect(list.length).toBeGreaterThan(5);
		expect(list.every((e) => e.town === 'Ropaži')).toBe(true);
	});
});

describe('daily entries', () => {
	test('merges per-day entries of one page into one event with occurrences', () => {
		const base = { source: 'muni-riga', sourceId: 'x', url: 'https://www.riga.lv/lv/notikums/x', title: 'X' };
		const merged = mergeDailyEntries([
			{ ...base, start: '2026-11-22T00:00:00+02:00' },
			{ ...base, start: '2026-11-21T00:00:00+02:00' },
			{ ...base, start: '2026-11-23T00:00:00+02:00' }
		]);
		expect(merged).toHaveLength(1);
		expect(merged[0]).toMatchObject({ sourceId: 'x', start: '2026-11-21T00:00:00+02:00' });
		expect(merged[0].occurrences).toEqual(['2026-11-22T00:00:00+02:00', '2026-11-23T00:00:00+02:00']);
	});
});

describe('live and archive paths', () => {
	beforeEach(() => resetPlatformState());
	const now = new Date('2026-11-20T10:00:00Z');
	const logs: string[] = [];
	const makeCtx = (http: Http): AdapterContext => ({ http, now, horizonDays: 120, log: (m) => logs.push(m) });

	test('falls back to the Wayback snapshot when the live site fails', async () => {
		const requested: string[] = [];
		const http: Http = {
			isAllowed: async () => true,
			text: async (url) => {
				requested.push(url);
				if (url.includes('web.archive.org')) return fixture('riga-20261104065136.html');
				throw new Error('TLS handshake timeout');
			},
			json: async <T>(url: string) => {
				requested.push(url);
				return { archived_snapshots: { closest: { available: true, timestamp: '20261104065136', status: '200' } } } as T;
			}
		};
		const events = await fetchMunicipality(riga, makeCtx(http));
		expect(logs.some((m) => m.includes('archived snapshot 20261104065136'))).toBe(true);
		expect(requested.some((u) => u.includes('/web/20261104065136id_/https://www.riga.lv/lv/notikumu-kalendars'))).toBe(true);
		expect(events.length).toBeGreaterThan(0);
		// Only events that have not ended survive.
		for (const event of events) expect(Date.parse(event.end ?? event.start)).toBeGreaterThan(now.getTime() - 12 * 3600_000);
	});

	test('does not retry the live host for later municipalities in the same run', async () => {
		let liveCalls = 0;
		const http: Http = {
			isAllowed: async () => true,
			text: async (url) => {
				if (url.includes('web.archive.org')) return fixture('ropazi-20261114000247.html');
				liveCalls++;
				throw new Error('timeout');
			},
			json: async <T>() => ({ archived_snapshots: { closest: { available: true, timestamp: '20261114000247', status: '200' } } }) as T
		};
		await fetchMunicipality(riga, makeCtx(http));
		await fetchMunicipality(ropazi, makeCtx(http));
		expect(liveCalls).toBe(1);
	});

	test('returns nothing when the archive has no snapshot', async () => {
		const http: Http = {
			isAllowed: async () => true,
			text: async () => {
				throw new Error('timeout');
			},
			json: async <T>() => ({ archived_snapshots: {} }) as T
		};
		expect(await fetchMunicipality(riga, makeCtx(http))).toEqual([]);
	});

	test('reads live pages and stops at the pager end', async () => {
		const html = fixture('ropazi-20261114000247.html');
		let calls = 0;
		const http: Http = {
			isAllowed: async () => true,
			text: async () => {
				calls++;
				return html;
			},
			json: async <T>() => ({}) as T
		};
		const events = await fetchMunicipality(ropazi, makeCtx(http));
		expect(calls).toBeGreaterThanOrEqual(1);
		expect(events.length).toBeGreaterThan(0);
	});
});

describe('adapter list', () => {
	test('has 24 adapters with unique muni- ids', () => {
		expect(adapters).toHaveLength(24);
		expect(new Set(adapters.map((a) => a.id)).size).toBe(24);
		expect(adapters.every((a) => a.id.startsWith('muni-') && !a.flag)).toBe(true);
	});
});
