import { describe, expect, test } from 'vitest';
import type { RawEvent } from '../src/lib/shared/types';
import { scrubText } from './lib/html';
import { isSourceResult, newestFresh, scrubContacts } from './relay';

const DAY_MS = 24 * 3600_000;

function rawEvent(patch: Partial<RawEvent> = {}): RawEvent {
	return { source: 'lnso', sourceId: '1', url: 'https://www.lnso.lv/e/1', title: 'Koncerts', start: '2026-12-01T19:00', ...patch };
}

describe('scrubText', () => {
	test('removes email addresses and Latvian phone numbers', () => {
		expect(scrubText('Pieteikšanās: apk@apk.lv vai tālr. +371 29 123 456.')).toBe('Pieteikšanās: vai tālr.');
		expect(scrubText('Zvani 67 123 456, rakstī info@kino.lv')).toBe('Zvani, rakstī');
	});

	test('keeps prices, years and times', () => {
		expect(scrubText('Biļetes 12 € līdz 2026. gada 1. decembrim, sākums 19.00')).toBe(
			'Biļetes 12 € līdz 2026. gada 1. decembrim, sākums 19.00'
		);
	});
});

describe('scrubContacts', () => {
	test('cleans description and organiser and leaves other fields', () => {
		const event = rawEvent({ description: 'Info: a@b.lv', organizer: 'Kino, tālr. 26 000 000' });
		const clean = scrubContacts(event);
		expect(clean.description).toBe('Info:');
		expect(clean.organizer).toBe('Kino, tālr.');
		expect(clean.title).toBe('Koncerts');
		expect(event.description).toBe('Info: a@b.lv');
	});
});

describe('newestFresh', () => {
	const now = Date.parse('2026-11-21T12:00:00Z');
	const at = (daysAgo: number) => ({ fetchedAt: new Date(now - daysAgo * DAY_MS).toISOString(), events: [] });

	const week = (result: ReturnType<typeof at> | undefined) => ({ result, maxAgeMs: 7 * DAY_MS });
	const month = (result: ReturnType<typeof at> | undefined) => ({ result, maxAgeMs: 30 * DAY_MS });

	test('picks the newest result under its age limit', () => {
		const cache = at(3);
		const relay = at(1);
		expect(newestFresh([week(cache), month(relay)], now)).toBe(relay);
	});

	test('ignores missing and stale results, each by its own limit', () => {
		expect(newestFresh([week(undefined), week(at(8))], now)).toBeUndefined();
		const relay = at(20);
		expect(newestFresh([week(at(8)), month(relay)], now)).toBe(relay);
		expect(newestFresh([month(at(31))], now)).toBeUndefined();
	});
});

describe('isSourceResult', () => {
	test('accepts a fetch time and an event list, rejects anything else', () => {
		expect(isSourceResult({ fetchedAt: '2026-11-21T12:00:00Z', events: [rawEvent()] })).toBe(true);
		expect(isSourceResult({ fetchedAt: 'yesterday', events: [] })).toBe(false);
		expect(isSourceResult({ fetchedAt: '2026-11-21T12:00:00Z', events: [{ title: 'x' }] })).toBe(false);
		expect(isSourceResult(undefined)).toBe(false);
	});
});
