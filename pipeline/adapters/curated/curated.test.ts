import { describe, expect, test } from 'vitest';
import { CURATED_RECORDS } from './data';
import { occurrencesFor, recordToRaw } from './parse';

const NOW = new Date('2026-11-20T10:00:00Z');
const byId = (id: string) => CURATED_RECORDS.find((r) => r.id === id)!;

describe('curated records', () => {
	test('ids are unique and every record has an organiser link', () => {
		const ids = CURATED_RECORDS.map((r) => r.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const record of CURATED_RECORDS) {
			expect(record.url).toMatch(/^https:\/\//);
			expect(record.fixed || record.recurrence).toBeTruthy();
			expect(record.confirmedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		}
	});
});

describe('occurrencesFor', () => {
	test('Kalnciema market runs on Saturdays 10:00 to 16:00 and skips Christmas market Saturdays', () => {
		const list = occurrencesFor(byId('kalnciema-tirgus'), NOW, 50);
		const days = list.map((o) => o.start.slice(0, 10));
		expect(days[0]).toBe('2026-11-21');
		expect(days).not.toContain('2026-11-28');
		expect(days).not.toContain('2026-12-05');
		expect(days).toContain('2027-01-02');
		expect(list[0].start).toBe('2026-11-21T10:00:00+02:00');
		expect(list[0].end).toBe('2026-11-21T16:00:00+02:00');
	});

	test('Christmas market covers the 5 Saturdays from 28 Nov to 26 Dec', () => {
		const days = occurrencesFor(byId('kalnciema-ziemassvetku-tirgus'), NOW, 120).map((o) => o.start.slice(0, 10));
		expect(days).toEqual(['2026-11-28', '2026-12-05', '2026-12-12', '2026-12-19', '2026-12-26']);
	});

	test('Vecrīga market uses weekday hours and December overrides', () => {
		const list = occurrencesFor(byId('vecrigas-ziemassvetku-tirdzins'), NOW, 60);
		expect(list[0].start).toBe('2026-11-27T11:00:00+02:00');
		expect(list[0].end).toBe('2026-11-27T22:00:00+02:00');
		const christmasEve = list.find((o) => o.start.startsWith('2026-12-24'))!;
		expect(christmasEve.start).toBe('2026-12-24T10:00:00+02:00');
		expect(list[list.length - 1].start.slice(0, 10)).toBe('2027-01-03');
	});

	test('drops events that already ended and events past the horizon', () => {
		expect(occurrencesFor(byId('unicon-winter-2027'), new Date('2027-01-11T10:00:00Z'), 30)).toEqual([]);
		expect(occurrencesFor(byId('unicon-winter-2027'), NOW, 30)).toEqual([]);
		expect(occurrencesFor(byId('unicon-winter-2027'), NOW, 60)).toHaveLength(1);
	});

	test('all-day multi-day event spans first to last day', () => {
		const [o] = occurrencesFor(byId('unicon-winter-2027'), NOW, 90);
		expect(o).toEqual({ start: '2027-01-08T00:00:00+02:00', end: '2027-01-10T23:59:00+02:00', allDay: true });
	});
});

describe('recordToRaw', () => {
	test('daily market gives start plus at most 20 occurrences', () => {
		const raw = recordToRaw(byId('latgalite'), NOW, 120)!;
		expect(raw.start).toBe('2026-11-20T08:00:00+02:00');
		expect(raw.occurrences).toHaveLength(20);
		expect(raw.defaultCategory).toBe('blusu');
		expect(raw.lat).toBeCloseTo(56.94, 1);
	});

	test('record without upcoming occurrences gives nothing', () => {
		expect(recordToRaw(byId('rimi-rigas-maratons-2027'), NOW, 60)).toBeUndefined();
		expect(recordToRaw(byId('rimi-rigas-maratons-2027'), NOW, 200)?.start).toBe('2027-05-15T00:00:00+03:00');
	});

	test('keeps UniCon prices, tags and tickets', () => {
		const raw = recordToRaw(byId('unicon-winter-2027'), NOW, 90)!;
		expect(raw).toMatchObject({ priceMin: 23, priceMax: 50, allDay: true, defaultCategory: 'anime' });
		expect(raw.tags).toContain('cosplay');
		expect(raw.tickets?.[0].url).toContain('unicon.lv');
	});
});
