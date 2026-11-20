import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import cinemas from './index';
import { ageFromRating, fixShoutingTitle, parseApolloSchedule, parseForumSchedule, showsToEvents } from './parse';

const read = (name: string) => readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
const NOW = new Date('2026-11-20T08:00:00Z');
const [apollo, forum] = cinemas;

const config = (id: string) => {
	// Reuse the adapter ids; addresses are exercised through the adapters' own config.
	return { source: id, sellerName: id === 'apollo-kino' ? 'Apollo Kino' : 'Forum Cinemas', addresses: {} };
};

describe('apollo kino feed', () => {
	const shows = parseApolloSchedule(read('apollo-schedule.json'));
	const events = showsToEvents(shows, config('apollo-kino'), NOW, 14);

	test('parses shows and groups them per film per cinema', () => {
		expect(shows.length).toBe(30);
		expect(events.length).toBeGreaterThan(0);
		expect(events.length).toBeLessThan(shows.length);
		expect(new Set(events.map((e) => e.sourceId)).size).toBe(events.length);
	});

	test('start is the earliest upcoming show and carries a Riga offset', () => {
		for (const event of events) {
			expect(event.start).toMatch(/^2026-\d\d-\d\dT\d\d:\d\d:00\+0[23]:00$/);
			expect(Date.parse(event.start)).toBeGreaterThanOrEqual(NOW.getTime());
			for (const later of event.occurrences ?? []) expect(Date.parse(later)).toBeGreaterThan(Date.parse(event.start));
		}
	});

	test('sets ticket link, category, tags, language and age', () => {
		const event = events[0];
		expect(event.tickets?.[0].url).toContain('apollokino.lv/websales/show/');
		expect(event.tickets?.[0].seller).toBe('Apollo Kino');
		expect(event.defaultCategory).toBe('izstades');
		expect(event.tags).toContain('kino');
		expect(event.lang?.[0]).toMatch(/^[a-z]{2}$/);
		expect(event.image).toMatch(/^https:\/\//);
	});

	test('drops shows that already started', () => {
		const late = new Date('2027-01-01T00:00:00Z');
		expect(showsToEvents(shows, config('apollo-kino'), late, 14)).toEqual([]);
	});
});

describe('forum cinemas feed', () => {
	const shows = parseForumSchedule(read('forum-schedule.xml'));
	const events = showsToEvents(shows, config('forum-cinemas'), NOW, 14);

	test('parses XML shows', () => {
		expect(shows.length).toBe(20);
		expect(events.length).toBeGreaterThan(0);
	});

	test('upgrades http links to https', () => {
		for (const event of events) {
			expect(event.url).toMatch(/^https:\/\//);
			expect(event.tickets?.[0].url).toMatch(/^https:\/\/www\.forumcinemas\.lv\/websales\//);
			expect(event.image ?? 'https://').toMatch(/^https:\/\//);
		}
	});

	test('maps age from rating label', () => {
		expect(events.some((e) => e.ageMin === 12 || e.ageMin === 16 || e.ageMin === 7)).toBe(true);
	});
});

describe('helpers and adapters', () => {
	test('ageFromRating', () => {
		expect(ageFromRating('N12')).toBe(12);
		expect(ageFromRating('16+')).toBe(16);
		expect(ageFromRating('U')).toBeUndefined();
	});

	test('fixShoutingTitle', () => {
		expect(fixShoutingTitle('GODZILLA MINUS ONE')).toBe('Godzilla minus one');
		expect(fixShoutingTitle('Dune: Part Two')).toBe('Dune: Part Two');
	});

	test('exports both adapter ids', () => {
		expect(cinemas.map((a) => a.id)).toEqual(['apollo-kino', 'forum-cinemas']);
	});
});
