import { describe, expect, test } from 'vitest';
import { formatDistance, formatEventDistance, formatPrice, formatPriceRange, formatTime, formatWhen, formatWhenLong } from './format';
import { plural, t } from './i18n';

const NBSP = ' ';
const n = (text: string) => text.replaceAll(NBSP, ' ');
// Friday 20 November 2026, 12.00 in Riga.
const now = new Date('2026-11-20T10:00:00Z');

describe('formatWhen', () => {
	test('uses relative day words near today', () => {
		expect(formatWhen({ start: '2026-11-20T15:00:00+02:00' }, now)).toBe('Šodien, 15.00');
		expect(formatWhen({ start: '2026-11-20T19:00:00+02:00' }, now)).toBe('Šovakar, 19.00');
		expect(formatWhen({ start: '2026-11-21T19:00:00+02:00' }, now)).toBe('Rīt, 19.00');
		expect(formatWhen({ start: '2026-11-22T19:00:00+02:00' }, now)).toBe('Parīt, 19.00');
		expect(formatWhen({ start: '2026-11-24T18:30:00+02:00' }, now)).toBe('Otrdien, 18.30');
	});

	test('uses the nominative date further out', () => {
		expect(n(formatWhen({ start: '2026-12-14T19:00:00+02:00' }, now))).toBe('14. decembris, 19.00');
		expect(n(formatWhen({ start: '2026-12-14T00:00:00+02:00', allDay: true }, now))).toBe('14. decembris');
	});

	test('formats ranges by length and month', () => {
		expect(n(formatWhen({ start: '2026-12-12T10:00:00+02:00', end: '2026-12-14T18:00:00+02:00' }, now))).toBe('12.–14. decembris');
		expect(n(formatWhen({ start: '2026-12-01T10:00:00+02:00', end: '2026-12-31T18:00:00+02:00' }, now))).toBe('1.–31. dec.');
		expect(n(formatWhen({ start: '2026-11-28T10:00:00+02:00', end: '2026-12-03T18:00:00+02:00' }, now))).toBe('28. nov. – 3. dec.');
		expect(n(formatWhen({ start: '2026-11-01T10:00:00+02:00', end: '2026-12-06T18:00:00+02:00' }, now))).toBe('Līdz 6. decembrim');
	});

	test('lists up to three separate days', () => {
		const event = { start: '2026-12-12T19:00:00+02:00', times: ['2026-12-14T19:00:00+02:00', '2026-12-16T19:00:00+02:00'] };
		expect(n(formatWhen(event, now))).toBe('12., 14. un 16. decembris');
	});

	test('treats an overnight party as one day', () => {
		expect(n(formatWhen({ start: '2026-12-12T23:00:00+02:00', end: '2026-12-13T04:00:00+02:00' }, now))).toBe('12. decembris, 23.00');
	});

	test('long form has a weekday and a time range', () => {
		expect(n(formatWhenLong({ start: '2026-12-14T19:00:00+02:00', end: '2026-12-14T21:30:00+02:00' }, now))).toBe(
			'Pirmdiena, 14. decembris, 19.00–21.30'
		);
	});

	test('formats time with a point', () => {
		expect(formatTime('2026-12-14T09:05:00+02:00')).toBe('9.05');
	});
});

describe('formatPrice', () => {
	test('follows the Latvian norm', () => {
		expect(formatPrice({ free: true })).toBe('Bez maksas');
		expect(n(formatPrice({ min: 12 })!)).toBe('12 €');
		expect(n(formatPrice({ min: 8.5 })!)).toBe('8,50 €');
		expect(n(formatPrice({ min: 8, max: 25 })!)).toBe('No 8 €');
		expect(n(formatPriceRange({ min: 8, max: 25 })!)).toBe('8–25 €');
		expect(formatPrice(undefined)).toBeUndefined();
	});
});

describe('formatDistance', () => {
	test('uses metres, one decimal, then whole kilometres', () => {
		expect(n(formatDistance(0.83))).toBe('850 m');
		expect(n(formatDistance(0.99))).toBe('1 km');
		expect(n(formatDistance(2.46))).toBe('2,5 km');
		expect(n(formatDistance(23.4))).toBe('23 km');
	});

	test('town-centre coordinates give no short distance and a rounded long one', () => {
		expect(formatEventDistance(0.05, true)).toBeUndefined();
		expect(formatEventDistance(2.9, true)).toBeUndefined();
		expect(n(formatEventDistance(12.4, true)!)).toBe('ap 12 km');
		expect(n(formatEventDistance(0.83, false)!)).toBe('850 m');
	});
});

describe('i18n', () => {
	test('interpolates and pluralises in three forms', () => {
		expect(t('home.place', { place: 'Rīga' })).toBe('Vieta: Rīga');
		expect(plural('events', 1)).toBe('1 pasākums');
		expect(plural('events', 21)).toBe('21 pasākums');
		expect(plural('events', 2)).toBe('2 pasākumi');
		expect(plural('events', 11)).toBe('11 pasākumu');
		expect(plural('events', 0, { noneKey: 'plural.none' })).toBe('Pasākumu nav');
	});
});
