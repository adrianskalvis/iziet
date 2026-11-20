import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import {
	blusaToRaw,
	bt1FairToRaw,
	buildKalnciemsEvents,
	cleanBlusaDescription,
	cleanLemadeTitle,
	fixEntryUrl,
	lemadeSlotToRaw,
	mergeBlusaDetails,
	parseBlusaMarkets,
	parseBt1Fairs,
	parseDayEntries,
	parseDetail,
	parseEventDays,
	parseFairDates,
	parseLemadeWeek
} from './parse';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const fixture = (name: string) => readFileSync(path.join(dir, name), 'utf8');
const NOW = new Date('2026-11-20T10:00:00Z');
const HORIZON = 120;

describe('blusa', () => {
	const markets = mergeBlusaDetails(
		parseBlusaMarkets(fixture('blusa-public.json')),
		parseBlusaMarkets(fixture('blusa-upcoming.json'))
	);
	const byId = (id: number) => markets.find((m) => m.id === id)!;

	test('recurring user market gives first date, times and later dates', () => {
		const raw = blusaToRaw(byId(274), NOW, HORIZON)!;
		expect(raw.start).toBe('2026-11-21T09:00:00+02:00');
		expect(raw.end).toBe('2026-11-21T15:00:00+02:00');
		expect(raw.occurrences).toEqual(['2026-11-28T09:00:00+02:00', '2026-12-05T09:00:00+02:00']);
		expect(raw.defaultCategory).toBe('blusu');
		expect(raw.url).toBe('https://blusa.eu/markets/274');
		expect(raw.lat).toBeCloseTo(56.66, 1);
	});

	test('scraped market without hours is all day and links to the official page', () => {
		const raw = blusaToRaw(byId(1530), NOW, HORIZON)!;
		expect(raw.allDay).toBe(true);
		expect(raw.start).toBe('2026-11-28T00:00:00+02:00');
		expect(raw.url).toBe('https://blusa.eu/markets/official/1530');
		expect(raw.defaultCategory).toBe('tirdzini');
	});

	test('multi-day market spans first to last day', () => {
		const raw = blusaToRaw(byId(1524), NOW, HORIZON)!;
		expect(raw.start).toBe('2026-12-11T00:00:00+02:00');
		expect(raw.end).toBe('2026-12-13T23:59:00+02:00');
	});

	test('drops events beyond the horizon', () => {
		expect(blusaToRaw(byId(1634), NOW, HORIZON)).toBeUndefined();
		expect(blusaToRaw(byId(1634), NOW, 200)?.start).toBe('2027-04-11T00:00:00+03:00');
	});

	test('keeps the whole fixture free of e-mail addresses and phone numbers', () => {
		const raws = markets.map((m) => blusaToRaw(m, NOW, 300)).filter(Boolean);
		expect(raws.length).toBeGreaterThan(25);
		for (const raw of raws) expect(raw!.description ?? '').not.toMatch(/@|\+371|\s\d{8}\s/);
	});

	test('removes contacts and organiser names from descriptions', () => {
		const text = 'Tirgus.\nKas organizē: Jānis Bērziņš\nTālr. +371 25316006, e-pasts: a@b.lv';
		expect(cleanBlusaDescription(text)).toBe('Tirgus.');
	});

	test('cancelled markets are skipped', () => {
		expect(blusaToRaw({ ...byId(274), is_cancelled: true }, NOW, HORIZON)).toBeUndefined();
	});
});

describe('lemade', () => {
	const week = parseLemadeWeek(fixture('lemade-week.html'));
	const next = parseLemadeWeek(fixture('lemade-week-next.html'));

	test('reads dates from the table head and the next week link', () => {
		expect(week.slots.length).toBeGreaterThan(5);
		expect(week.slots.every((s) => /^2026-11-(1[6-9]|2[0-2])$/.test(s.date))).toBe(true);
		expect(week.nextUrl).toBe('https://clients.bookigen.com/8Lp2y4/s/Y5rbd5/2026/48');
		expect(next.slots.every((s) => /^2026-11-(2[3-9])$/.test(s.date))).toBe(true);
	});

	test('maps a Tuesday ceramics class with price and Latvian-only title', () => {
		const slot = next.slots.find((s) => /veidošana/.test(s.title))!;
		const raw = lemadeSlotToRaw(slot, NOW, HORIZON)!;
		expect(raw).toMatchObject({
			start: '2026-11-24T19:00:00+02:00',
			end: '2026-11-24T21:00:00+02:00',
			priceMin: 60,
			defaultCategory: 'darbnicas',
			town: 'Rīga'
		});
		expect(raw.title).not.toMatch(/[А-Яа-я]/);
		expect(raw.tags).toEqual(['keramika']);
	});

	test('skips private group bookings and slots that already ended', () => {
		const all = [...week.slots, ...next.slots].map((s) => lemadeSlotToRaw(s, NOW, HORIZON));
		expect(all.some((e) => e && /savējiem/.test(e.title))).toBe(false);
		const past = week.slots.find((s) => s.date === '2026-11-17')!;
		expect(lemadeSlotToRaw(past, NOW, HORIZON)).toBeUndefined();
	});

	test('cleans bilingual titles', () => {
		expect(cleanLemadeTitle('Keramika bērniem / Керамика для детей')).toBe('Keramika bērniem');
		expect(cleanLemadeTitle('Meistarklase ♡ Мастер-класс')).toBe('Meistarklase');
	});
});

describe('bt1', () => {
	const fairs = parseBt1Fairs(fixture('bt1-fairs.html'));

	test('reads every fair row', () => {
		expect(fairs.map((f) => f.name)).toContain('KIDS EXPO RIGA');
		expect(fairs).toHaveLength(16);
	});

	test('parses date ranges', () => {
		expect(parseFairDates('BALTTOUR 05.02.–07.02.2027.')).toEqual({ from: '2027-02-05', to: '2027-02-07' });
		expect(parseFairDates('x 30.12.–02.01.2027.')).toEqual({ from: '2026-12-30', to: '2027-01-02' });
	});

	test('maps Kids Expo as a family event at Ķīpsala and drops trade-only fairs', () => {
		const kids = bt1FairToRaw(fairs.find((f) => f.name === 'KIDS EXPO RIGA')!, NOW, HORIZON)!;
		expect(kids).toMatchObject({
			start: '2027-03-06T00:00:00+02:00',
			end: '2027-03-07T23:59:00+02:00',
			allDay: true,
			defaultCategory: 'gimenem',
			address: 'Ķīpsalas iela 8'
		});
		expect(kids.title).toMatch(/^Kids Expo Riga: /);
		const tech = fairs.find((f) => f.name === 'TECH INDUSTRY')!;
		expect(bt1FairToRaw(tech, NOW, HORIZON)).toBeUndefined();
	});

	test('keeps only fairs inside the horizon', () => {
		const events = fairs.map((f) => bt1FairToRaw(f, NOW, HORIZON)).filter(Boolean);
		expect(events.map((e) => e!.sourceId.split('-')[0])).toEqual(['BALTTOUR', 'SKOLA', 'KIDS EXPO RIGA', 'PETEXPO', 'OUTDOOR RIGA']);
	});
});

describe('kalnciems', () => {
	test('reads event days of the month grid', () => {
		expect(parseEventDays(fixture('kalnciems-home.html'))).toEqual([
			'2026-11-07',
			'2026-11-12',
			'2026-11-14',
			'2026-11-21',
			'2026-11-28'
		]);
		expect(parseEventDays(fixture('kalnciems-dec.html'))).toEqual(['2026-12-05']);
	});

	test('reads day entries and repairs the link path', () => {
		const [entry] = parseDayEntries(fixture('kalnciems-day-2026-11-28.html'));
		expect(entry.title).toBe('Ziemassvētku tirgus no 28.11. līdz 26.12. sestdienās');
		expect(entry.url).toBe('https://www.kalnciemaiela.lv/lv/aktualitates/ziemassvetku-tirgus-no-2811-lidz-2612-sestdienas/');
		expect(fixEntryUrl('https://www.kalnciemaiela.lv/lv/aktualiates/x')).toBe('https://www.kalnciemaiela.lv/lv/aktualitates/x/');
	});

	test('reads the detail text without date line and funding note', () => {
		const detail = parseDetail(fixture('kalnciems-detail-market.html'));
		expect(detail.description).toMatch(/^Sestdienās plkst\. 10\.00-16\.00/);
		expect(detail.description).not.toMatch(/ESF|2022\.06\.29/);
	});

	test('groups days per entry into start and occurrences', () => {
		const url = 'https://www.kalnciemaiela.lv/lv/aktualitates/x/';
		const events = buildKalnciemsEvents(
			new Map([[url, { title: 'Tirgus', days: ['2026-11-21', '2026-11-28', '2026-12-05'] }]]),
			new Map([[url, { description: 'Teksts' }]]),
			NOW,
			HORIZON
		);
		expect(events).toHaveLength(1);
		expect(events[0]).toMatchObject({ start: '2026-11-21T00:00:00+02:00', allDay: true, description: 'Teksts' });
		expect(events[0].occurrences).toEqual(['2026-11-28T00:00:00+02:00', '2026-12-05T00:00:00+02:00']);
	});
});
