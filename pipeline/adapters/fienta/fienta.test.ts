import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { fixShoutingTitle, parseFientaEvents, parseFientaPrice, townFromAddress, type FientaResponse } from './parse';

const fixture = JSON.parse(readFileSync(path.join(__dirname, 'fixtures/events.json'), 'utf8')) as FientaResponse;
const NOW = new Date('2026-11-20T10:00:00Z');

describe('fienta parse', () => {
	const events = parseFientaEvents(fixture, NOW, 400);

	test('keeps events with Riga offset and Fienta ticket link', () => {
		expect(events.length).toBeGreaterThan(5);
		for (const event of events) {
			expect(event.start).toMatch(/\+0[23]:00$/);
			expect(event.tickets?.[0].seller).toBe('Fienta');
			expect(event.url).toMatch(/^https:\/\/fienta\.com\//);
			expect((event.description ?? '').length).toBeLessThanOrEqual(600);
		}
	});

	test('never carries organiser contact data', () => {
		const text = JSON.stringify(events);
		expect(text).not.toContain('x@example.com');
		expect(text).not.toContain('organizer_phone');
	});

	test('drops multi-year gift cards and past events', () => {
		const gift = { id: 1, title: 'Gift', starts_at: '2020-09-01 00:00:00', ends_at: '2029-09-01 23:59:59', url: 'https://fienta.com/g' };
		const past = { id: 2, title: 'Past', starts_at: '2026-11-01 19:00:00', ends_at: '2026-11-01 21:00:00', url: 'https://fienta.com/p' };
		expect(parseFientaEvents({ events: [gift, past] }, NOW, 400)).toEqual([]);
	});

	test('maps cancelled and sold out status', () => {
		const base = { title: 'X', starts_at: '2026-12-03 19:00:00', url: 'https://fienta.com/x' };
		const out = parseFientaEvents(
			{ events: [{ ...base, id: 1, event_status: 'cancelled' }, { ...base, id: 2, sale_status: 'soldOut' }] },
			NOW,
			400
		);
		expect(out.map((e) => e.status)).toEqual(['cancelled', 'soldout']);
	});

	test('applies the horizon', () => {
		const far = { id: 3, title: 'Far', starts_at: '2027-12-03 19:00:00', url: 'https://fienta.com/f' };
		expect(parseFientaEvents({ events: [far] }, NOW, 30)).toEqual([]);
	});
});

describe('fienta helpers', () => {
	test('converts shouting titles only when all upper case', () => {
		expect(fixShoutingTitle('DĀVANU KARTE UZ MEISTARKLASI')).toBe('Dāvanu karte uz meistarklasi');
		expect(fixShoutingTitle('Koncerts RAMMSTEIN tribute')).toBe('Koncerts RAMMSTEIN tribute');
	});

	test('reads price strings', () => {
		expect(parseFientaPrice('From 5 EUR, free')).toEqual({ priceMin: 0, priceMax: 5 });
		expect(parseFientaPrice('Free')).toEqual({ free: true, priceMin: 0, priceMax: 0 });
		expect(parseFientaPrice('From 80 EUR')).toEqual({ priceMin: 80, priceMax: undefined });
		expect(parseFientaPrice(null)).toEqual({});
	});

	test('finds the town', () => {
		expect(townFromAddress('Stabu iela 42, LV-1011 Rīga')).toBe('Rīga');
		expect(townFromAddress('Rīga')).toBeUndefined();
	});
});
