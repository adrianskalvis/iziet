import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
	listingBeyondHorizon,
	monthFromAbbreviation,
	parseDetail,
	parseListing,
	parseListingTotal,
	sellerName
} from './parse';

const read = (name: string) => readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
const NOW = new Date('2026-11-20T08:00:00Z');
const BASE = 'https://www.liveriga.com/lv/apmekle/pasakumi/';

describe('liveriga listing', () => {
	const items = parseListing(read('listing.html'));

	test('reads cards with url, category and date text', () => {
		expect(items.length).toBe(10);
		expect(items[0].url).toMatch(/^https:\/\/www\.liveriga\.com\/lv\/apmekle\/pasakumi\//);
		expect(items.every((item) => item.category && item.dateText)).toBe(true);
	});

	test('reads the total count', () => {
		expect(parseListingTotal(read('listing.html'))).toBeGreaterThan(200);
	});

	test('skips single-date cards beyond the horizon only', () => {
		expect(listingBeyondHorizon({ url: 'x', dateText: '20 Apr' }, NOW, 90)).toBe(true);
		expect(listingBeyondHorizon({ url: 'x', dateText: '05 Dec' }, NOW, 90)).toBe(false);
		expect(listingBeyondHorizon({ url: 'x', dateText: '23 Okt - 12 Dec' }, NOW, 90)).toBe(false);
	});
});

describe('liveriga detail', () => {
	test('single date: time, price, Biļešu Serviss link, coordinates', () => {
		const event = parseDetail(read('detail-single.html'), `${BASE}koncerti-sovi/fatboy-slim-koncerts`, NOW, 120)!;
		expect(event.title).toBe('Fatboy Slim koncerts');
		expect(event.start).toBe('2026-11-20T20:00:00+02:00');
		expect(event.allDay).toBeUndefined();
		expect(event.priceMin).toBe(59.98);
		expect(event.priceMax).toBe(105.96);
		expect(event.tickets?.[0]).toEqual({
			seller: 'Biļešu Serviss',
			url: 'https://www.bilesuserviss.lv/biletes/WAHYBEP5O7/fatboy-slim-crave-night-palladium'
		});
		expect(event.venueName).toBe('Palladium Rīga');
		expect(event.address).toBe('Marijas iela 21');
		expect(event.lat).toBeCloseTo(56.951, 2);
		expect(event.lng).toBeCloseTo(24.1256, 2);
		expect(event.image).toContain('fatboyslim_palladium.jpeg');
		expect(event.categoryHint).toContain('Koncerti (šovi)');
		expect((event.description ?? '').length).toBeLessThanOrEqual(600);
	});

	test('date range: all day, end date, past start kept', () => {
		const event = parseDetail(read('detail-range.html'), `${BASE}makslas-izstades-ekspozicijas/izstade-dizie-vardi-modes-pasaule`, NOW, 365)!;
		expect(event.start).toBe('2026-11-25T00:00:00+02:00');
		expect(event.end).toBe('2027-04-18T23:59:00+03:00');
		expect(event.allDay).toBe(true);
		expect(event.priceMin).toBe(5);
		expect(event.priceMax).toBe(8);
	});

	test('several dates: first upcoming start and later occurrences', () => {
		const event = parseDetail(read('detail-multi.html'), `${BASE}opera-balets/riekstkodis`, NOW, 120)!;
		expect(event.start).toBe('2026-12-05T19:00:00+02:00');
		expect(event.occurrences?.[0]).toBe('2026-12-06T12:00:00+02:00');
		expect(event.occurrences!.length).toBeLessThanOrEqual(20);
	});

	test('returns nothing when every date is past', () => {
		const later = new Date('2027-06-01T00:00:00Z');
		expect(parseDetail(read('detail-multi.html'), `${BASE}opera-balets/riekstkodis`, later, 120)).toBeUndefined();
	});
});

describe('liveriga helpers', () => {
	test('month abbreviations include Mai', () => {
		expect(monthFromAbbreviation('Mai')).toBe(5);
		expect(monthFromAbbreviation('Jūn')).toBe(6);
		expect(monthFromAbbreviation('Okt')).toBe(10);
	});

	test('names ticket sellers', () => {
		expect(sellerName('https://www.bilesuserviss.lv/biletes/X')).toBe('Biļešu Serviss');
		expect(sellerName('https://www.example.com/x')).toBe('example.com');
	});
});
